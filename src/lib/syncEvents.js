'use client';

/**
 * Sync Events - Centralized event definitions for socket synchronization
 * 
 * All sync events should use these constants to ensure consistency
 * across the application.
 */

// Event type constants
export const SYNC_EVENTS = {
    // Camera events (high-frequency, throttled)
    CAMERA_UPDATE: 'camera:update',

    // Landmark events
    LANDMARK_SELECT: 'landmark:select',
    LANDMARK_DESELECT: 'landmark:deselect',

    // Route events
    ROUTE_CREATE: 'route:create',
    ROUTE_CLEAR: 'route:clear',

    // Filter events
    FILTER_CHANGE: 'filter:change',

    // View mode events
    VIEW_MODE: 'view:mode',

    // Aspect ratio sync (receiver broadcasts to controllers)
    ASPECT_RATIO: 'aspect:ratio',
};

// Event priority levels (for future use in event queuing)
export const EVENT_PRIORITY = {
    [SYNC_EVENTS.CAMERA_UPDATE]: 1,      // Low priority, can be dropped
    [SYNC_EVENTS.FILTER_CHANGE]: 2,      // Medium priority
    [SYNC_EVENTS.VIEW_MODE]: 2,          // Medium priority
    [SYNC_EVENTS.LANDMARK_SELECT]: 3,    // High priority
    [SYNC_EVENTS.LANDMARK_DESELECT]: 3,  // High priority
    [SYNC_EVENTS.ROUTE_CREATE]: 3,       // High priority
    [SYNC_EVENTS.ROUTE_CLEAR]: 3,        // High priority
};

// Throttle settings per event type (ms)
export const EVENT_THROTTLE = {
    [SYNC_EVENTS.CAMERA_UPDATE]: 300,    // Throttle camera to 300ms
    [SYNC_EVENTS.FILTER_CHANGE]: 0,      // No throttle
    [SYNC_EVENTS.VIEW_MODE]: 0,          // No throttle
    [SYNC_EVENTS.LANDMARK_SELECT]: 0,    // No throttle
    [SYNC_EVENTS.LANDMARK_DESELECT]: 0,  // No throttle
    [SYNC_EVENTS.ROUTE_CREATE]: 0,       // No throttle
    [SYNC_EVENTS.ROUTE_CLEAR]: 0,        // No throttle
};

// Initial block period (ms) - don't sync during initial animation
export const INITIAL_BLOCK_MS = 6000;

// Cooldown period after receiving remote event (ms)
export const RECEIVE_COOLDOWN_MS = 1500;

/**
 * Create a sync payload with metadata
 */
export function createSyncPayload(event, data, clientId) {
    return {
        event,
        payload: data,
        sessionId: clientId,
        timestamp: Date.now(),
    };
}

/**
 * Validate incoming sync payload
 */
export function isValidSyncPayload(data) {
    return (
        data &&
        typeof data.event === 'string' &&
        data.payload !== undefined &&
        typeof data.sessionId === 'string' &&
        typeof data.timestamp === 'number'
    );
}

/**
 * Check if an event should be throttled
 */
export function shouldThrottle(event) {
    return EVENT_THROTTLE[event] > 0;
}

/**
 * Get throttle delay for an event
 */
export function getThrottleDelay(event) {
    return EVENT_THROTTLE[event] || 0;
}

/**
 * Simple throttle function
 */
export function throttle(func, delay) {
    let lastCall = 0;
    let timeoutId = null;

    return function throttled(...args) {
        const now = Date.now();
        const timeSinceLastCall = now - lastCall;

        if (timeSinceLastCall >= delay) {
            lastCall = now;
            func.apply(this, args);
        } else {
            // Schedule trailing call
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                lastCall = Date.now();
                func.apply(this, args);
            }, delay - timeSinceLastCall);
        }
    };
}

/**
 * Simple debounce function
 */
export function debounce(func, delay) {
    let timeoutId = null;

    return function debounced(...args) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}
