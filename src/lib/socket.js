"use client";

import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000';

let socket = null;

// Get the socket (create if doesn't exist)
export const getSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: false,
            transports: ['websocket', 'polling']
        });
    }
    return socket;
};

export const connectSocket = () => {
    const s = getSocket();
    if (!s.connected) {
        s.connect();
    }
    return s;
};

export const disconnectSocket = () => {
    if (socket?.connected) {
        socket.disconnect();
    }
};