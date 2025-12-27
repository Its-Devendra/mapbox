"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Mic, Square, Trash2, Send, X, Volume2, VolumeX } from "lucide-react";
// Removed Redux imports/hooks as they are missing in this environment
// import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";
// import { selectSelectedMapId, selectFilterConfigs, selectFilterLoading } from "@/lib/store/selectors";
// import { setMapFilterIds, setHighlightedMarkerIds } from "@/lib/store/slices/filterSlice";
// import { setSelectedMapId } from "@/lib/store/slices/mapSlice";
// import { useLandmark } from "@/lib/hooks/useLandmark";
import "./ChatInterface.css";

// Constants for storage
const CHAT_HISTORY_KEY = "sumadhura_chat_history";
const CHAT_MESSAGES_KEY = "sumadhura_chat_messages";
const SPOKEN_MESSAGES_KEY = "sumadhura_spoken_messages";
const CHAT_OPEN_STATE_KEY = "sumadhura_chat_open_state";
const LANGUAGE_KEY = "sumadhura_chat_language";

// Custom error class for quota exceeded
class QuotaExceededError extends Error {
    constructor(message, retryAfterSeconds = null) {
        super(message);
        this.name = "QuotaExceededError";
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

// Supported languages
const LANGUAGES = [
    { code: "en-US", name: "English", script: "English" },
    { code: "te-IN", name: "Telugu", script: "తెలుగు" },
    { code: "ta-IN", name: "Tamil", script: "தமிழ்" },
    { code: "ml-IN", name: "Malayalam", script: "മലയാളം" },
    { code: "hi-IN", name: "Hindi", script: "हिंदी" },
    { code: "mr-IN", name: "Marathi", script: "मराठी" },
    { code: "bn-IN", name: "Bengali", script: "বাংলা" },
    { code: "kn-IN", name: "Kannada", script: "ಕನ್ನಡ" },
    { code: "gu-IN", name: "Gujarati", script: "ગુજરાતી" },
    { code: "pa-IN", name: "Punjabi", script: "ਪੰਜਾਬੀ" },
    { code: "or-IN", name: "Odia", script: "ଓଡ଼ିଆ" },
    { code: "ur-IN", name: "Urdu", script: "اردو" },
    { code: "as-IN", name: "Assamese", script: "অসমীয়া" },
];

// Language code mapping for browser language detection
const LANGUAGE_CODE_MAP = {
    en: "en-US",
    te: "te-IN",
    ta: "ta-IN",
    ml: "ml-IN",
    hi: "hi-IN",
    mr: "mr-IN",
    bn: "bn-IN",
    kn: "kn-IN",
    gu: "gu-IN",
    pa: "pa-IN",
    or: "or-IN",
    ur: "ur-IN",
    as: "as-IN",
};

// Detect user's preferred language from browser/system settings
const detectUserLanguage = () => {
    try {
        const saved = localStorage.getItem(LANGUAGE_KEY);
        if (saved) return saved;

        if (typeof window !== "undefined" && navigator.languages) {
            for (const lang of navigator.languages) {
                const langParts = lang.split("-");
                const langCode = langParts[0]?.toLowerCase();
                if (!langCode) continue;

                if (LANGUAGE_CODE_MAP[langCode]) {
                    return LANGUAGE_CODE_MAP[langCode];
                }
            }
        }

        if (typeof window !== "undefined" && navigator.language) {
            const langParts = navigator.language.split("-");
            const langCode = langParts[0]?.toLowerCase();
            if (langCode && LANGUAGE_CODE_MAP[langCode]) {
                return LANGUAGE_CODE_MAP[langCode];
            }
        }
    } catch (error) {
        console.warn("Error detecting language:", error);
    }
    return "en-US";
};

// Global functions to manage chat open state across pages
export const getChatOpenState = () => {
    try {
        const saved = localStorage.getItem(CHAT_OPEN_STATE_KEY);
        return saved === "true";
    } catch (error) {
        console.warn("Error reading chat open state:", error);
        return false;
    }
};

export const setChatOpenState = (isOpen) => {
    try {
        localStorage.setItem(CHAT_OPEN_STATE_KEY, isOpen.toString());
    } catch (error) {
        console.warn("Error saving chat open state:", error);
    }
};

// Helper function to normalize history format
const normalizeHistory = (history) => {
    return history.map((item) => {
        if (item.content) {
            return { role: item.role, content: item.content };
        } else if (item.parts && item.parts.length > 0) {
            const text = item.parts.map((part) => part.text || "").join("");
            return { role: item.role, content: text };
        } else {
            return { role: item.role, content: "" };
        }
    });
};

const ChatInterface = () => {
    const router = useRouter();
    const pathname = usePathname();
    // const dispatch = useAppDispatch();
    const selectedMapId = "10km"; // Mocked
    const filterConfigs = []; // Mocked
    const filterLoading = false; // Mocked
    // const activeMapFilterIds = useAppSelector((state) => state.filter.activeMapFilterIds);
    // const { setLandmarkId } = useLandmark();
    const setLandmarkId = () => { }; // Mocked

    const API_URL = "/api/chat";

    const [messages, setMessages] = useState([]);
    const [history, setHistory] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedLanguage, setSelectedLanguage] = useState("en-US");
    const [isListening, setIsListening] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioContextRef = useRef(null);

    const messagesEndRef = useRef(null);

    // Load initial data
    useEffect(() => {
        try {
            const savedMessages = localStorage.getItem(CHAT_MESSAGES_KEY);
            const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);

            const parsedMessages = savedMessages ? JSON.parse(savedMessages) : null;
            const parsedHistory = savedHistory ? JSON.parse(savedHistory) : [];

            if (parsedMessages && parsedMessages.length > 0) {
                setMessages(parsedMessages);
            } else {
                setMessages([{
                    role: "assistant",
                    content: "Hi! How can I help you with the location map today?",
                    id: "welcome-msg-" + Date.now(),
                }]);
            }
            setHistory(parsedHistory);
            setSelectedLanguage(detectUserLanguage());
        } catch (e) {
            console.error(e);
        }
    }, []);

    // Save data
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (messages.length > 0) {
                localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(messages));
            }
            if (history.length > 0) {
                localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
            }
            localStorage.setItem(LANGUAGE_KEY, selectedLanguage);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [messages, history, selectedLanguage]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (textOverride = null) => {
        const text = textOverride || inputValue.trim();
        if (!text || isLoading) return;

        const userMsg = { role: "user", content: text, id: Date.now().toString() };
        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    history: history,
                    language_code: selectedLanguage,
                    map_type: selectedMapId,
                    project_id: "shalimar-evara", // Ensure this matches backend expectation
                    current_slug: pathname,
                    user_id: localStorage.getItem("chat_user_id") || "guest",
                    session_id: localStorage.getItem("chat_session_id") || `session_${Date.now()}`
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();

            const assistantMsg = {
                role: "assistant",
                content: data.response || "I couldn't generate a response.",
                id: (Date.now() + 1).toString()
            };

            setMessages(prev => [...prev, assistantMsg]);

            if (data.history) {
                setHistory(normalizeHistory(data.history));
            }

            if (data.highlighted_locations) {
                handleHighlightLocations(data.highlighted_locations);
            }

            if (data.audio_stream_url) {
                handleAudioStream(data.audio_stream_url);
            }

        } catch (err) {
            console.error(err);
            setError(err.message);
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "Sorry, I encountered an error. Please try again.",
                id: (Date.now() + 1).toString()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleHighlightLocations = (locations) => {
        locations.forEach(loc => {
            // Dispatch event for MapContainer to pick up
            const event = new CustomEvent('CHAT_HIGHLIGHT_LOCATION', {
                detail: loc
            });
            window.dispatchEvent(event);
        });
    };

    const handleAudioStream = (url) => {
        // Basic Audio Stream implementation 
        // Note: Full SSE Audio streaming might require more complex buffer management.
        // Here we attempt a direct stream or fetch.
        try {
            // If the URL is suitable for direct playback (e.g. mp3 stream), use Audio()
            // But the guide mentions SSE. 
            // We'll trust the guide's hint about Web Audio API + SSE.
            // For now, implementing a placeholder that logs the URL or uses basic Audio if possible.
            console.log("Audio Stream URL received:", url);

            // Simplest attempt:
            // const audio = new Audio(url);
            // audio.play();
        } catch (e) {
            console.error("Audio playback error:", e);
        }
    };

    const startVoiceInput = () => {
        if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-IN'; // English (India)
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onerror = (e) => {
                console.error("Speech recognition error", e);
                setIsListening(false);
            };
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (transcript) {
                    setInputValue(transcript);
                    handleSendMessage(transcript);
                }
            };
            recognition.start();
        } else {
            alert("Voice input is not supported in this browser.");
        }
    };

    const clearChatHistory = () => {
        if (confirm("Clear chat history?")) {
            setMessages([{
                role: "assistant",
                content: "History cleared.",
                id: Date.now().toString()
            }]);
            setHistory([]);
            localStorage.removeItem(CHAT_MESSAGES_KEY);
            localStorage.removeItem(CHAT_HISTORY_KEY);
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-header">
                <div>
                    <div className="chat-header-title">Location Assistant</div>
                    <div className="chat-header-subtitle">Ask me about nearby places</div>
                </div>
                <button onClick={clearChatHistory} className="ml-auto text-white/80 hover:text-white">
                    <Trash2 size={16} />
                </button>
            </div>

            <div className="language-selector-container">
                <label className="language-label">Language:</label>
                <select
                    className="language-dropdown"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                >
                    {LANGUAGES.map(l => (
                        <option key={l.code} value={l.code}>{l.name}</option>
                    ))}
                </select>
            </div>

            <div className="chat-messages">
                {messages.map((msg) => (
                    <div key={msg.id} className={`message-wrapper ${msg.role}`}>
                        <div className={`message ${msg.role}`}>
                            <div className="message-content">{msg.content}</div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="message-wrapper assistant">
                        <div className="message assistant">
                            <div className="typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
                <input
                    type="text"
                    className="chat-input"
                    placeholder={isListening ? "Listening..." : "Type your question..."}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isLoading}
                />
                <button
                    className={`icon-button ${isListening ? 'mic-active' : ''}`}
                    onClick={() => startVoiceInput()}
                    disabled={isLoading}
                    title="Voice Input"
                >
                    <Mic size={18} />
                </button>
                <button
                    className="icon-button send-button"
                    onClick={() => handleSendMessage()}
                    disabled={!inputValue.trim() || isLoading}
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
};

export default ChatInterface;
