'use client';

import { useEffect, useCallback, useRef, useState } from "react";
import { useSync, SYNC_EVENTS } from "@/context/SyncContext";

/**
 * Hook for syncing viewport state between receiver and controller screens
 * 
 * The receiver (typically a large display) broadcasts its:
 * - Aspect ratio (width/height)
 * - Camera position (center, zoom, pitch, bearing)
 * 
 * Controllers apply both to ensure the exact same visible map area.
 * 
 * @param {object} options
 * @param {boolean} options.isReceiver - Whether this device is the receiver
 * @param {object} options.mapRef - Reference to the Mapbox map instance
 * @returns {object} - { broadcastViewport, receivedViewport }
 */
export function useAspectRatioSync({ isReceiver = false, mapRef = null } = {}) {
    const { sendSync, subscribe, isConnected } = useSync();
    const [receivedAspectRatio, setReceivedAspectRatio] = useState(null);
    const [receivedCamera, setReceivedCamera] = useState(null);
    const lastBroadcastRef = useRef(null);
    const hasReceivedRef = useRef(false);

    // Broadcast aspect ratio AND camera position (receiver only)
    const broadcastAspectRatio = useCallback((width, height) => {
        if (!isReceiver) return;
        if (!width || !height || width <= 0 || height <= 0) return;

        const ratio = width / height;

        // Also get current camera position if map is available
        let camera = null;
        if (mapRef?.current) {
            const map = mapRef.current;
            const center = map.getCenter();
            camera = {
                center: [center.lng, center.lat],
                zoom: map.getZoom(),
                pitch: map.getPitch(),
                bearing: map.getBearing()
            };
        }

        const payload = {
            width,
            height,
            ratio,
            camera // Include camera state
        };

        // Skip if same as last broadcast (aspect ratio only, camera can change)
        const key = `${width}x${height}`;
        if (lastBroadcastRef.current === key && !camera) return;

        lastBroadcastRef.current = key;
        console.log("📐 Broadcasting viewport state:", payload);
        sendSync(SYNC_EVENTS.ASPECT_RATIO, payload);
    }, [isReceiver, sendSync, mapRef]);

    // Broadcast aspect ratio WITH specific camera (for when camera is ready after animation)
    const broadcastWithCamera = useCallback((width, height, camera) => {
        if (!isReceiver) return;
        if (!width || !height || width <= 0 || height <= 0) return;

        const ratio = width / height;
        const payload = { width, height, ratio, camera };

        lastBroadcastRef.current = `${width}x${height}`;
        console.log("📐 Broadcasting viewport with camera:", payload);
        sendSync(SYNC_EVENTS.ASPECT_RATIO, payload);
    }, [isReceiver, sendSync]);

    // Broadcast camera position separately (for when camera moves after initial sync)
    const broadcastCamera = useCallback(() => {
        if (!isReceiver || !mapRef?.current) return;

        const map = mapRef.current;
        const center = map.getCenter();
        const width = parseInt(lastBroadcastRef.current?.split('x')[0]) || 0;
        const height = parseInt(lastBroadcastRef.current?.split('x')[1]) || 0;

        if (!width || !height) return;

        const payload = {
            width,
            height,
            ratio: width / height,
            camera: {
                center: [center.lng, center.lat],
                zoom: map.getZoom(),
                pitch: map.getPitch(),
                bearing: map.getBearing()
            }
        };

        console.log("📐 Broadcasting camera update:", payload);
        sendSync(SYNC_EVENTS.ASPECT_RATIO, payload);
    }, [isReceiver, sendSync, mapRef]);

    // Receive aspect ratio AND camera (controller only)
    useEffect(() => {
        console.log('📐 useAspectRatioSync: Setting up subscription, isReceiver =', isReceiver, 'isConnected =', isConnected);

        if (isReceiver) {
            console.log('📐 Skipping subscription - this is the receiver');
            return; // Receivers don't listen for aspect ratio
        }

        if (!isConnected) {
            console.log('📐 Controller: Waiting for socket connection...');
            return; // Wait for connection before subscribing
        }

        console.log('📐 Controller: Subscribing to ASPECT_RATIO events (connected!)');

        const unsubscribe = subscribe(SYNC_EVENTS.ASPECT_RATIO, (payload) => {
            console.log('📐 Controller: Received ASPECT_RATIO event!', payload);

            const { width, height, ratio, camera } = payload;

            // Validate payload
            if (!ratio || ratio <= 0) {
                console.warn("⚠️ Invalid aspect ratio received:", payload);
                return;
            }

            console.log("📐 Controller: Setting receivedAspectRatio and receivedCamera", { ratio, camera });
            hasReceivedRef.current = true;
            setReceivedAspectRatio({ width, height, ratio });

            // Also set camera if included
            if (camera) {
                console.log("📍 Received camera position:", camera);
                setReceivedCamera(camera);
            }
        });

        // Fallback: If no aspect ratio received within 5 seconds, use default 16:9 for large displays
        const fallbackTimeout = setTimeout(() => {
            if (!hasReceivedRef.current) {
                console.log('📐 Controller: No aspect ratio received, using fallback 16:9');
                setReceivedAspectRatio({ width: 1920, height: 1080, ratio: 1920 / 1080 });
            }
        }, 5000);

        return () => {
            unsubscribe();
            clearTimeout(fallbackTimeout);
        };
    }, [isReceiver, subscribe, isConnected]); // Added isConnected!

    // Re-broadcast when connection established or when new members join (receiver only)
    useEffect(() => {
        if (!isReceiver || !isConnected) return;

        // Re-broadcast after a short delay to ensure other clients receive it
        const timeoutId = setTimeout(() => {
            if (lastBroadcastRef.current && mapRef?.current) {
                const [w, h] = lastBroadcastRef.current.split('x').map(Number);
                if (w && h) {
                    const map = mapRef.current;
                    const center = map.getCenter();
                    console.log("📐 Re-broadcasting viewport state on connect");
                    sendSync(SYNC_EVENTS.ASPECT_RATIO, {
                        width: w,
                        height: h,
                        ratio: w / h,
                        camera: {
                            center: [center.lng, center.lat],
                            zoom: map.getZoom(),
                            pitch: map.getPitch(),
                            bearing: map.getBearing()
                        }
                    });
                }
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [isReceiver, isConnected, sendSync, mapRef]);

    // Store last camera for periodic re-broadcast
    const lastCameraRef = useRef(null);

    // Update stored camera when broadcastWithCamera is called
    const broadcastWithCameraAndStore = useCallback((width, height, camera) => {
        if (!isReceiver) return;
        if (!width || !height || width <= 0 || height <= 0) return;

        // Store the camera for periodic re-broadcast
        lastCameraRef.current = { width, height, camera };

        const ratio = width / height;
        const payload = { width, height, ratio, camera };

        lastBroadcastRef.current = `${width}x${height}`;
        console.log("📐 Broadcasting viewport with camera:", payload);
        sendSync(SYNC_EVENTS.ASPECT_RATIO, payload);
    }, [isReceiver, sendSync]);

    // Periodic re-broadcast for late-joining controllers (every 5 seconds)
    useEffect(() => {
        if (!isReceiver || !isConnected) return;

        const intervalId = setInterval(() => {
            if (lastCameraRef.current) {
                const { width, height, camera } = lastCameraRef.current;
                if (width && height && camera) {
                    console.log("📐 Periodic re-broadcast for late joiners");
                    sendSync(SYNC_EVENTS.ASPECT_RATIO, {
                        width,
                        height,
                        ratio: width / height,
                        camera
                    });
                }
            }
        }, 5000); // Re-broadcast every 5 seconds

        return () => clearInterval(intervalId);
    }, [isReceiver, isConnected, sendSync]);

    return {
        broadcastAspectRatio,
        broadcastWithCamera: broadcastWithCameraAndStore, // Use the one that stores camera
        broadcastCamera,
        receivedAspectRatio,
        receivedCamera,
        hasReceivedAspectRatio: hasReceivedRef.current || receivedAspectRatio !== null,
        isConnected,
    };
}
