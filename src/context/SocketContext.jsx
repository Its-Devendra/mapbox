'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";

const SocketContext = createContext(null);

export function SocketProvider({ children, roomId, roomName = "Mapbox Room" }) {
    const [isConnected, setIsConnected] = useState(false);
    const [roomMembers, setRoomMembers] = useState(0);

    const clientIdRef = useRef(
        `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );

    useEffect(() => {
        if (!roomId) return;

        const socket = connectSocket();

        const onConnect = () => {
            setIsConnected(true);
            console.log("🔌 Socket connected, joining room:", roomId);

            // Use "joinRoom" to match your backend event handler
            socket.emit("joinRoom", {
                roomId: roomId,
                rmname: roomName,
                deviceType: 'web'
            });
        };

        const onDisconnect = () => {
            console.log("🔌 Socket disconnected");
            setIsConnected(false);
        };

        const onRoomJoined = (data) => {
            console.log("✅ Joined room:", data);
            setRoomMembers(data.members || 0);
        };

        // Listen for these events
        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("room:joined", onRoomJoined);

        // If already connected, join room now
        if (socket.connected) {
            onConnect();
        }

        // Cleanup when component unmounts
        return () => {
            console.log("🔌 Leaving room:", roomId);
            socket.emit("leaveRoom", roomId);
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("room:joined", onRoomJoined);
            disconnectSocket();
        };
    }, [roomId, roomName]);

    const sendSync = (eventType, payload) => {
        const socket = getSocket();
        if (socket?.connected) {
            console.log("📤 Sending sync:", eventType, payload);
            socket.emit('sync_event', {
                rmId: roomId,
                event: eventType,
                sessionId: clientIdRef.current,
                timestamp: Date.now(),
                payload,
            });
        }
    };

    const value = {
        socket: getSocket(),
        isConnected,
        roomMembers,
        clientId: clientIdRef.current,
        sendSync,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => {
    const context = useContext(SocketContext);
    // Return safe defaults if not within SocketProvider (instead of throwing)
    if (!context) {
        return {
            socket: null,
            isConnected: false,
            clientId: null,
            roomMembers: 0,
            sendSync: () => { },
        };
    }
    return context;
};