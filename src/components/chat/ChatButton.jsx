import React from 'react';
import { MessageCircle, X } from 'lucide-react';
import './ChatInterface.css';

const ChatButton = ({ isOpen, onClick }) => {
    return (
        <button
            className={`chat-floating-button ${isOpen ? 'active' : ''}`}
            onClick={onClick}
            aria-label={isOpen ? "Close chat" : "Open chat"}
        >
            {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
        </button>
    );
};

export default ChatButton;
