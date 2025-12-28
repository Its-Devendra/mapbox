'use client';

import { useEffect, useCallback, useRef, useMemo } from "react";
import { useSync, SYNC_EVENTS } from "@/context/SyncContext";

/**
 * Specialized sync hooks for map synchronization
 * 
 * These hooks provide clean APIs for syncing specific features
 * with built-in throttling, validation, and error handling.
 */

// ============================================================================
// Camera Sync Hook
// ============================================================================

// Shared state for route animation blocking
// When a route is being created, camera sync should be blocked to prevent
// aspect-ratio conflicts (controller's fitBounds zoom != receiver's ideal zoom)
const ROUTE_ANIMATION_BLOCK_MS = 5000; // Block camera sync for 5s after landmark select
let lastLandmarkSelectTime = 0;

// Function to mark that a route animation is starting (called from landmark sync)
export function markRouteAnimationStart() {
    lastLandmarkSelectTime = Date.now();
    console.log("🛑 Camera sync blocked for route animation");
}

// Check if we're in route animation period
function isInRouteAnimation() {
    return Date.now() - lastLandmarkSelectTime < ROUTE_ANIMATION_BLOCK_MS;
}

/**
 * Hook for syncing camera position (center, zoom, pitch, bearing)
 * 
 * @param {object} mapRef - Ref to Mapbox map instance
 * @returns {object} - { syncCamera }
 */
export function useCameraSync(mapRef) {
    const { getThrottledSender, subscribe, isConnected } = useSync();
    const lastSentRef = useRef(null);

    // Get throttled sender (300ms)
    const throttledSend = useMemo(() => {
        return getThrottledSender(SYNC_EVENTS.CAMERA_UPDATE, 300);
    }, [getThrottledSender]);

    // Send camera position
    const syncCamera = useCallback((cameraState) => {
        // BLOCK: Don't sync camera during route animation
        if (isInRouteAnimation()) {
            console.log("⏭️ Skip camera sync - route animation in progress");
            return;
        }

        // Skip if same as last sent (prevent echo)
        const stateKey = JSON.stringify(cameraState);
        if (lastSentRef.current === stateKey) return;

        lastSentRef.current = stateKey;
        throttledSend(cameraState);
    }, [throttledSend]);

    // Receive camera updates
    useEffect(() => {
        const unsubscribe = subscribe(SYNC_EVENTS.CAMERA_UPDATE, (payload) => {
            const map = mapRef?.current;
            if (!map) return;

            // BLOCK: Don't apply camera during route animation
            if (isInRouteAnimation()) {
                console.log("⏭️ Skip camera receive - route animation in progress");
                return;
            }

            const { center, zoom, pitch, bearing } = payload;

            // Validate zoom (reject globe view)
            if (zoom < 1 || zoom > 22) {
                console.log("⏭️ Invalid zoom rejected:", zoom);
                return;
            }

            console.log("🗺️ Applying camera update");
            map.flyTo({
                center,
                zoom,
                pitch,
                bearing,
                duration: 400,
                essential: true,
            });
        });

        return unsubscribe;
    }, [subscribe, mapRef]);

    return { syncCamera, isConnected };
}

// ============================================================================
// Landmark Sync Hook
// ============================================================================

/**
 * Hook for syncing landmark selection
 * 
 * @param {object} options
 * @param {array} options.landmarks - List of landmarks
 * @param {function} options.onSelect - Callback when landmark selected
 * @param {function} options.onDeselect - Callback when landmark deselected
 * @returns {object} - { syncSelect, syncDeselect }
 */
export function useLandmarkSync({ landmarks, onSelect, onDeselect }) {
    const { sendSync, subscribe, isConnected } = useSync();

    // Send landmark select
    const syncSelect = useCallback((landmarkId) => {
        // Block camera sync during route animation
        markRouteAnimationStart();
        sendSync(SYNC_EVENTS.LANDMARK_SELECT, { landmarkId });
    }, [sendSync]);

    // Send landmark deselect
    const syncDeselect = useCallback(() => {
        sendSync(SYNC_EVENTS.LANDMARK_DESELECT, {});
    }, [sendSync]);

    // Receive landmark select
    useEffect(() => {
        const unsubscribe = subscribe(SYNC_EVENTS.LANDMARK_SELECT, (payload) => {
            const { landmarkId } = payload;
            const landmark = landmarks.find(l => l.id === landmarkId);

            if (landmark && onSelect) {
                console.log("📍 Remote landmark select:", landmarkId);
                // Block camera sync during route animation (receiver side too)
                markRouteAnimationStart();
                onSelect(landmark);
            }
        });

        return unsubscribe;
    }, [subscribe, landmarks, onSelect]);

    // Receive landmark deselect
    useEffect(() => {
        const unsubscribe = subscribe(SYNC_EVENTS.LANDMARK_DESELECT, () => {
            if (onDeselect) {
                console.log("📍 Remote landmark deselect");
                onDeselect();
            }
        });

        return unsubscribe;
    }, [subscribe, onDeselect]);

    return { syncSelect, syncDeselect, isConnected };
}

// ============================================================================
// Route Sync Hook
// ============================================================================

/**
 * Hook for syncing route creation/clearing
 * 
 * @param {object} options
 * @param {function} options.onCreate - Callback when route created
 * @param {function} options.onClear - Callback when route cleared
 * @returns {object} - { syncCreate, syncClear }
 */
export function useRouteSync({ onCreate, onClear }) {
    const { sendSync, subscribe, isConnected } = useSync();

    // Send route create
    const syncCreate = useCallback((landmarkId) => {
        sendSync(SYNC_EVENTS.ROUTE_CREATE, { landmarkId });
    }, [sendSync]);

    // Send route clear
    const syncClear = useCallback(() => {
        sendSync(SYNC_EVENTS.ROUTE_CLEAR, {});
    }, [sendSync]);

    // Receive route create
    useEffect(() => {
        const unsubscribe = subscribe(SYNC_EVENTS.ROUTE_CREATE, (payload) => {
            if (onCreate) {
                console.log("🛣️ Remote route create:", payload.landmarkId);
                onCreate(payload.landmarkId);
            }
        });

        return unsubscribe;
    }, [subscribe, onCreate]);

    // Receive route clear
    useEffect(() => {
        const unsubscribe = subscribe(SYNC_EVENTS.ROUTE_CLEAR, () => {
            if (onClear) {
                console.log("🛣️ Remote route clear");
                onClear();
            }
        });

        return unsubscribe;
    }, [subscribe, onClear]);

    return { syncCreate, syncClear, isConnected };
}

// ============================================================================
// Filter Sync Hook
// ============================================================================

/**
 * Hook for syncing filter state
 * 
 * @param {object} options
 * @param {function} options.onFilterChange - Callback when filters change
 * @returns {object} - { syncFilters }
 */
export function useFilterSync({ onFilterChange }) {
    const { sendSync, subscribe, isConnected } = useSync();
    const lastSentRef = useRef(null);

    // Send filter change
    const syncFilters = useCallback((activeFilters) => {
        // Skip if same as last sent
        const filterKey = JSON.stringify(activeFilters);
        if (lastSentRef.current === filterKey) return;

        lastSentRef.current = filterKey;
        sendSync(SYNC_EVENTS.FILTER_CHANGE, { activeFilters });
    }, [sendSync]);

    // Receive filter change
    useEffect(() => {
        const unsubscribe = subscribe(SYNC_EVENTS.FILTER_CHANGE, (payload) => {
            if (onFilterChange) {
                console.log("🔍 Remote filter change:", payload.activeFilters);
                onFilterChange(payload.activeFilters || []);
            }
        });

        return unsubscribe;
    }, [subscribe, onFilterChange]);

    return { syncFilters, isConnected };
}

// ============================================================================
// View Mode Sync Hook
// ============================================================================

/**
 * Hook for syncing 2D/3D view mode
 * 
 * @param {object} options
 * @param {function} options.onModeChange - Callback when mode changes
 * @returns {object} - { syncViewMode }
 */
export function useViewModeSync({ onModeChange }) {
    const { sendSync, subscribe, isConnected } = useSync();

    // Send view mode change
    const syncViewMode = useCallback((mode) => {
        sendSync(SYNC_EVENTS.VIEW_MODE, { mode });
    }, [sendSync]);

    // Receive view mode change
    useEffect(() => {
        const unsubscribe = subscribe(SYNC_EVENTS.VIEW_MODE, (payload) => {
            if (onModeChange) {
                console.log("👁️ Remote view mode:", payload.mode);
                onModeChange(payload.mode);
            }
        });

        return unsubscribe;
    }, [subscribe, onModeChange]);

    return { syncViewMode, isConnected };
}

// ============================================================================
// Combined Map Sync Hook (convenience)
// ============================================================================

/**
 * Combined hook for all map sync features
 * Use this for simpler integration
 * 
 * @param {object} options
 * @returns {object} - All sync functions
 */
export function useMapSync(mapRef, options = {}) {
    const {
        landmarks = [],
        onLandmarkSelect,
        onLandmarkDeselect,
        onRouteCreate,
        onRouteClear,
        onFilterChange,
        onViewModeChange,
    } = options;

    const camera = useCameraSync(mapRef);

    const landmark = useLandmarkSync({
        landmarks,
        onSelect: onLandmarkSelect,
        onDeselect: onLandmarkDeselect,
    });

    const route = useRouteSync({
        onCreate: onRouteCreate,
        onClear: onRouteClear,
    });

    const filter = useFilterSync({
        onFilterChange,
    });

    const viewMode = useViewModeSync({
        onModeChange: onViewModeChange,
    });

    return {
        // Camera
        syncCamera: camera.syncCamera,

        // Landmark
        syncLandmarkSelect: landmark.syncSelect,
        syncLandmarkDeselect: landmark.syncDeselect,

        // Route
        syncRouteCreate: route.syncCreate,
        syncRouteClear: route.syncClear,

        // Filter
        syncFilters: filter.syncFilters,

        // View mode
        syncViewMode: viewMode.syncViewMode,

        // Connection state
        isConnected: camera.isConnected,
    };
}
