"use client";

import React, { useState, useEffect } from 'react';
import ChatButton from './ChatButton';
import ChatInterface, { getChatOpenState, setChatOpenState } from './ChatInterface';
import './ChatInterface.css';

const ChatContainer = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Sync with initial state from localStorage
        setIsOpen(getChatOpenState());
    }, []);

    const toggleChat = () => {
        const newState = !isOpen;
        setIsOpen(newState);
        setChatOpenState(newState);
    };

    return (
        <>
            <div className={`chat-widget-container ${isOpen ? 'open' : ''}`}>
                <ChatInterface />
            </div>
            <ChatButton isOpen={isOpen} onClick={toggleChat} />
        </>
    );
};

export default ChatContainer;
