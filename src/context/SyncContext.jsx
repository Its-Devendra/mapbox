'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import {
    SYNC_EVENTS,
    INITIAL_BLOCK_MS,
    RECEIVE_COOLDOWN_MS,
    throttle,
    isValidSyncPayload
} from "@/lib/syncEvents";

/**
 * SyncContext - Centralized real-time synchronization provider
 * 
 * Handles all socket communication for multi-screen sync with:
 * - Automatic connection management
 * - Tab visibility awareness
 * - Throttled camera updates
 * - Initial load protection
 * - Receive cooldown to prevent loops
 */

const SyncContext = createContext(null);

export function SyncProvider({ children, roomId, roomName = "Mapbox Room" }) {
    // Connection state
    const [isConnected, setIsConnected] = useState(false);
    const [roomMembers, setRoomMembers] = useState(0);

    // Sync state
    const [isSyncEnabled, setIsSyncEnabled] = useState(true);
    const [isTabVisible, setIsTabVisible] = useState(true);

    // Refs for stable access
    const socketRef = useRef(null);
    const clientIdRef = useRef(
        `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );
    const mountTimeRef = useRef(Date.now());
    const lastReceiveTimeRef = useRef(0);
    const eventListenersRef = useRef(new Map());
    const throttledSendersRef = useRef(new Map());

    // Check if in initial load period
    const isInInitialLoad = useCallback(() => {
        return Date.now() - mountTimeRef.current < INITIAL_BLOCK_MS;
    }, []);

    // Check if in receive cooldown
    const isInReceiveCooldown = useCallback(() => {
        return Date.now() - lastReceiveTimeRef.current < RECEIVE_COOLDOWN_MS;
    }, []);

    // Tab visibility handling
    useEffect(() => {
        const handleVisibilityChange = () => {
            const visible = !document.hidden;
            setIsTabVisible(visible);
            console.log(`👁️ Tab visibility: ${visible ? 'visible' : 'hidden'}`);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Socket connection management
    useEffect(() => {
        if (!roomId) return;

        const socket = connectSocket();
        socketRef.current = socket;

        const onConnect = () => {
            setIsConnected(true);
            console.log("🔌 Socket connected, joining room:", roomId);

            socket.emit("joinRoom", {
                roomId: roomId,
                rmname: roomName,
                deviceType: 'web'
            });
        };

        const onDisconnect = (reason) => {
            console.log("🔌 Socket disconnected:", reason);
            setIsConnected(false);
        };

        const onRoomJoined = (data) => {
            console.log("✅ Joined room:", data);
            setRoomMembers(data.members || 0);
        };

        const onReconnect = (attemptNumber) => {
            console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
        };

        // Register socket events
        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("room:joined", onRoomJoined);
        socket.io.on("reconnect", onReconnect);

        // If already connected, join room now
        if (socket.connected) {
            onConnect();
        }

        return () => {
            console.log("🔌 Cleaning up socket connection");
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("room:joined", onRoomJoined);
            socket.io.off("reconnect", onReconnect);

            // Clean up all event listeners
            eventListenersRef.current.forEach((handler, event) => {
                socket.off("sync_event", handler);
            });
            eventListenersRef.current.clear();

            disconnectSocket();
            socketRef.current = null;
        };
    }, [roomId, roomName]);

    /**
     * Send a sync event to other clients
     * 
     * @param {string} event - Event type from SYNC_EVENTS
     * @param {object} payload - Event data
     * @param {object} options - Options like skipThrottle
     */
    const sendSync = useCallback((event, payload, options = {}) => {
        const socket = socketRef.current;

        // Validation checks
        if (!socket?.connected) {
            console.log("⏭️ Skip send - not connected");
            return;
        }

        if (!isSyncEnabled) {
            console.log("⏭️ Skip send - sync disabled");
            return;
        }

        if (isInInitialLoad()) {
            console.log("⏭️ Skip send - initial load period");
            return;
        }

        if (isInReceiveCooldown() && event === SYNC_EVENTS.CAMERA_UPDATE) {
            console.log("⏭️ Skip send - receive cooldown");
            return;
        }

        const syncData = {
            rmId: roomId,
            event,
            sessionId: clientIdRef.current,
            timestamp: Date.now(),
            payload,
        };

        console.log(`📤 Sending sync: ${event}`, payload);
        socket.emit("sync_event", syncData);
    }, [roomId, isSyncEnabled, isInInitialLoad, isInReceiveCooldown]);

    /**
     * Get a throttled version of sendSync for high-frequency events
     */
    const getThrottledSender = useCallback((event, delayMs = 300) => {
        if (!throttledSendersRef.current.has(event)) {
            const throttled = throttle((payload) => {
                sendSync(event, payload);
            }, delayMs);
            throttledSendersRef.current.set(event, throttled);
        }
        return throttledSendersRef.current.get(event);
    }, [sendSync]);

    /**
     * Subscribe to sync events
     * 
     * @param {string} event - Event type to listen for
     * @param {function} handler - Callback function
     * @returns {function} Unsubscribe function
     */
    const subscribe = useCallback((event, handler) => {
        const socket = socketRef.current;
        if (!socket) return () => { };

        const wrappedHandler = (data) => {
            // Skip own events
            if (data.sessionId === clientIdRef.current) return;

            // Skip if tab is hidden (for performance)
            if (!isTabVisible) {
                console.log("⏭️ Skip receive - tab hidden");
                return;
            }

            // Skip during initial load
            if (isInInitialLoad()) {
                console.log("⏭️ Skip receive - initial load");
                return;
            }

            // Check event type matches
            if (data.event !== event) return;

            // Validate payload
            if (!isValidSyncPayload(data)) {
                console.warn("⚠️ Invalid sync payload:", data);
                return;
            }

            // Update receive time for cooldown
            lastReceiveTimeRef.current = Date.now();

            console.log(`📥 Received sync: ${event}`);
            handler(data.payload, data);
        };

        socket.on("sync_event", wrappedHandler);
        eventListenersRef.current.set(`${event}-${handler.toString().slice(0, 50)}`, wrappedHandler);

        return () => {
            socket.off("sync_event", wrappedHandler);
        };
    }, [isTabVisible, isInInitialLoad]);

    // Context value
    const value = {
        // Connection state
        isConnected,
        roomMembers,
        clientId: clientIdRef.current,

        // Sync controls
        isSyncEnabled,
        setIsSyncEnabled,
        isTabVisible,

        // Core functions
        sendSync,
        getThrottledSender,
        subscribe,

        // Utility checks
        isInInitialLoad,
        isInReceiveCooldown,
    };

    return (
        <SyncContext.Provider value={value}>
            {children}
        </SyncContext.Provider>
    );
}

/**
 * Hook to access sync context
 * Returns safe defaults if not within SyncProvider
 */
export const useSync = () => {
    const context = useContext(SyncContext);

    // Return safe defaults if not within provider
    if (!context) {
        return {
            isConnected: false,
            roomMembers: 0,
            clientId: null,
            isSyncEnabled: false,
            setIsSyncEnabled: () => { },
            isTabVisible: true,
            sendSync: () => { },
            getThrottledSender: () => () => { },
            subscribe: () => () => { },
            isInInitialLoad: () => true,
            isInReceiveCooldown: () => false,
        };
    }

    return context;
};

// Re-export event constants for convenience
export { SYNC_EVENTS };
