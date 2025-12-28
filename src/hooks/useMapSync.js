'use client';

import { useEffect, useCallback, useRef } from "react";
import { useSocket } from "@/context/SocketContext";

/**
 * useMapSync hook - Syncs map interactions with other connected viewers
 * 
 * @param {Object} mapRef - Ref to Mapbox map instance
 * @param {Object} options - Event handlers for receiving sync events
 * @param {Function} options.onLandmarkSelect - Called when remote selects landmark
 * @param {Function} options.onLandmarkDeselect - Called when remote deselects landmark
 * @param {Function} options.onRouteCreate - Called when remote creates route
 * @param {Function} options.onRouteClear - Called when remote clears route
 * @param {Function} options.onFilterChange - Called when remote changes filter
 * @param {Function} options.onViewModeChange - Called when remote changes view mode
 */
export default function useMapSync(mapRef, options = {}) {
    const {
        onLandmarkSelect,
        onLandmarkDeselect,
        onRouteCreate,
        onRouteClear,
        onFilterChange,
        onViewModeChange,
    } = options;

    // useSocket now returns safe defaults if not in SocketProvider
    const { socket, isConnected, clientId, sendSync } = useSocket();

    // Track if socket is available
    const isSocketAvailable = socket !== null && isConnected;

    // COOLDOWN APPROACH: After receiving any remote event, don't send for X ms
    const lastRemoteUpdateTimeRef = useRef(0);
    const COOLDOWN_MS = 2000; // 2 second cooldown after receiving

    // INITIAL LOAD PROTECTION: Don't sync (send OR receive) for first X seconds
    const mountTimeRef = useRef(Date.now());
    const INITIAL_BLOCK_MS = 6000; // 6 seconds for initial animation to complete

    // Check if we're still in initial load period
    const isInInitialLoad = useCallback(() => {
        return Date.now() - mountTimeRef.current < INITIAL_BLOCK_MS;
    }, []);

    // Check if we're in cooldown period
    const isInCooldown = useCallback(() => {
        if (isInInitialLoad()) return true;
        const timeSinceLastRemote = Date.now() - lastRemoteUpdateTimeRef.current;
        return timeSinceLastRemote < COOLDOWN_MS;
    }, [isInInitialLoad]);

    // Send camera position when user pans/zooms
    const syncCamera = useCallback((cameraState) => {
        if (!isSocketAvailable) return;
        if (isInInitialLoad()) return;
        if (isInCooldown()) return;

        sendSync("camera:update", cameraState);
    }, [sendSync, isInCooldown, isInInitialLoad, isSocketAvailable]);

    // Send when user clicks a landmark
    const syncLandmark = useCallback((landmarkId, action = "select") => {
        if (!isSocketAvailable || isInCooldown()) return;
        console.log(`📤 Syncing landmark:${action}`, landmarkId);
        sendSync(`landmark:${action}`, { landmarkId });
    }, [sendSync, isInCooldown, isSocketAvailable]);

    // Send when route is created/cleared
    const syncRoute = useCallback((routeData, action = "create") => {
        if (!isSocketAvailable || isInCooldown()) return;
        console.log(`📤 Syncing route:${action}`, routeData);
        sendSync(`route:${action}`, routeData);
    }, [sendSync, isInCooldown, isSocketAvailable]);

    // Send when filter changes
    const syncFilter = useCallback((activeFilters) => {
        if (!isSocketAvailable || isInCooldown()) return;
        console.log("📤 Syncing filter:change", activeFilters);
        sendSync("filter:change", { activeFilters });
    }, [sendSync, isInCooldown, isSocketAvailable]);

    // Send when switching 2D/3D view
    const syncViewMode = useCallback((mode) => {
        if (!isSocketAvailable || isInCooldown()) return;
        console.log("📤 Syncing view:mode", mode);
        sendSync("view:mode", { mode });
    }, [sendSync, isInCooldown, isSocketAvailable]);

    // Listen for incoming sync events from other users
    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleSyncEvent = (data) => {
            // Skip our own events
            if (data.sessionId === clientId) {
                return;
            }

            // BLOCK RECEIVE during initial load
            if (isInInitialLoad()) {
                console.log("⏭️ Ignoring sync RECEIVE - initial load period");
                return;
            }

            console.log("📥 Received sync event:", data.event);

            // Mark that we received a remote update
            lastRemoteUpdateTimeRef.current = Date.now();

            const map = mapRef?.current;

            switch (data.event) {
                case "camera:update":
                    if (!map) return;
                    const { center, zoom, pitch, bearing } = data.payload;

                    if (zoom < 1) {
                        console.log("⏭️ Ignoring camera update - zoom too low:", zoom);
                        return;
                    }

                    console.log("🗺️ Applying camera update from remote");
                    map.flyTo({ center, zoom, pitch, bearing, duration: 500 });
                    break;

                case "landmark:select":
                    console.log("📍 Applying landmark select:", data.payload.landmarkId);
                    onLandmarkSelect?.(data.payload.landmarkId);
                    break;

                case "landmark:deselect":
                    console.log("📍 Applying landmark deselect");
                    onLandmarkDeselect?.();
                    break;

                case "route:create":
                    console.log("🛣️ Applying route create:", data.payload);
                    onRouteCreate?.(data.payload);
                    break;

                case "route:clear":
                    console.log("🛣️ Applying route clear");
                    onRouteClear?.();
                    break;

                case "filter:change":
                    console.log("🔍 Applying filter change:", data.payload.activeFilters);
                    onFilterChange?.(data.payload.activeFilters);
                    break;

                case "view:mode":
                    console.log("👁️ Applying view mode:", data.payload.mode);
                    onViewModeChange?.(data.payload.mode);
                    break;
            }
        };

        socket.on("sync_event", handleSyncEvent);

        return () => {
            socket.off("sync_event", handleSyncEvent);
        };
    }, [socket, isConnected, clientId, mapRef, isInInitialLoad,
        onLandmarkSelect, onLandmarkDeselect, onRouteCreate, onRouteClear,
        onFilterChange, onViewModeChange]);

    return {
        syncCamera,
        syncLandmark,
        syncRoute,
        syncFilter,
        syncViewMode,
        isInCooldown,
        isSocketAvailable,
    };
}