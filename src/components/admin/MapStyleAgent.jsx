'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Wand2,
    Sparkles,
    RefreshCw,
    Save,
    Undo2,
    Eye,
    EyeOff,
    Sun,
    Moon,
    Palette,
    Layers,
    Send,
    Loader2,
    Check,
    X,
    ChevronDown,
    ChevronUp,
    Zap,
    Building,
    MapPin,
    Route as RouteIcon,
    TreePine,
    Droplets,
    Type,
    Grid3X3
} from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
    generateIntelligentStyle,
    generateStyleFromPrompt,
    applyStylesToMap,
    MAPBOX_LAYERS,
    hexToHSL,
    isDarkColor
} from '@/services/styleAgentService';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
    "pk.eyJ1IjoiZGV2Yml0czA5IiwiYSI6ImNtYzkyZTR2dDE0MDAyaXMzdXRndjJ0M2EifQ.Jhhx-1tf_NzrZNfGX8wp_w";

/**
 * MapStyleAgent Component
 * 
 * An AI-powered map style builder that generates complete Mapbox styles
 * based on primary/secondary colors and natural language prompts.
 */
export default function MapStyleAgent({
    initialPrimary = '#1e3a8a',
    initialSecondary = '#ffffff',
    onStyleGenerated,
    onClose
}) {
    // Colors
    const [primaryColor, setPrimaryColor] = useState(initialPrimary);
    const [secondaryColor, setSecondaryColor] = useState(initialSecondary);

    // Mode and options
    const [mode, setMode] = useState('auto'); // 'auto', 'light', 'dark'
    const [intensity, setIntensity] = useState('normal'); // 'subtle', 'normal', 'vibrant'
    const [showLabels, setShowLabels] = useState(true);
    const [showPOI, setShowPOI] = useState(true);
    const [show3DBuildings, setShow3DBuildings] = useState(true);

    // AI Chat
    const [chatInput, setChatInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hi! I'm your Map Style Agent. Give me your colors and I'll design a beautiful, cohesive map style. You can also describe what you want in words!"
        }
    ]);

    // Style state
    const [currentStyle, setCurrentStyle] = useState(null);
    const [styleHistory, setStyleHistory] = useState([]);
    const [appliedModifications, setAppliedModifications] = useState([]);

    // Map
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const [mapLoaded, setMapLoaded] = useState(false);

    // Advanced panel
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Initialize map
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const isDark = mode === 'dark' || (mode === 'auto' && isDarkColor(primaryColor));

        mapRef.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
            center: [77.08, 28.49], // Delhi
            zoom: 12,
            pitch: 45,
            bearing: -17.6,
            interactive: true
        });

        mapRef.current.on('load', () => {
            setMapLoaded(true);
            // Auto-generate initial style
            handleAutoGenerate();
        });

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Auto-generate style when colors change
    const handleAutoGenerate = useCallback(() => {
        if (!mapRef.current) return;

        setIsGenerating(true);

        try {
            const styleData = generateIntelligentStyle(primaryColor, secondaryColor, {
                mode,
                intensity,
                showLabels,
                showPOI,
                show3DBuildings
            });

            setCurrentStyle(styleData);
            setStyleHistory(prev => [...prev, styleData]);

            // Apply to map
            if (mapRef.current.isStyleLoaded()) {
                const isDark = mode === 'dark' || (mode === 'auto' && isDarkColor(primaryColor));
                const baseStyle = isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';

                // Set base style first, then apply modifications
                mapRef.current.once('style.load', () => {
                    const results = applyStylesToMap(mapRef.current, styleData);
                    setAppliedModifications(results?.applied || []);
                });
                mapRef.current.setStyle(baseStyle);
            }

            // Add success message
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `✨ Generated a ${isDarkColor(primaryColor) ? 'dark' : 'light'} ${intensity} style! Applied ${styleData.modifications.length} modifications.`
            }]);

        } catch (error) {
            console.error('Style generation failed:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ Failed to generate style. Please try again.'
            }]);
        } finally {
            setIsGenerating(false);
        }
    }, [primaryColor, secondaryColor, mode, intensity, showLabels, showPOI, show3DBuildings]);

    // Handle chat input (AI prompt)
    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || isGenerating) return;

        const userMessage = chatInput.trim();
        setChatInput('');

        // Add user message
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsGenerating(true);

        try {
            // Add thinking message
            setMessages(prev => [...prev, { role: 'assistant', content: '🤔 Analyzing your request...', isThinking: true }]);

            // Generate style from prompt
            const styleData = await generateStyleFromPrompt(userMessage, primaryColor, secondaryColor);

            // Remove thinking message and add result
            setMessages(prev => {
                const filtered = prev.filter(m => !m.isThinking);
                return [...filtered, {
                    role: 'assistant',
                    content: `🎨 Applied your style! Used ${styleData.metadata.mode} mode with ${styleData.metadata.intensity} intensity. Made ${styleData.modifications.length} modifications.`
                }];
            });

            setCurrentStyle(styleData);
            setStyleHistory(prev => [...prev, styleData]);

            // Update colors if AI suggested new ones
            if (styleData.metadata.primaryColor !== primaryColor) {
                setPrimaryColor(styleData.metadata.primaryColor);
            }
            if (styleData.metadata.secondaryColor !== secondaryColor) {
                setSecondaryColor(styleData.metadata.secondaryColor);
            }

            // Apply to map
            if (mapRef.current && mapRef.current.isStyleLoaded()) {
                mapRef.current.once('style.load', () => {
                    const results = applyStylesToMap(mapRef.current, styleData);
                    setAppliedModifications(results?.applied || []);
                });
                mapRef.current.setStyle(styleData.baseStyle);
            }

        } catch (error) {
            console.error('AI generation failed:', error);
            setMessages(prev => {
                const filtered = prev.filter(m => !m.isThinking);
                return [...filtered, {
                    role: 'assistant',
                    content: "I couldn't fully understand that. Try something like 'dark theme with blue roads' or 'minimal clean style'."
                }];
            });
        } finally {
            setIsGenerating(false);
        }
    };

    // Undo last change
    const handleUndo = () => {
        if (styleHistory.length < 2) return;

        const previousStyle = styleHistory[styleHistory.length - 2];
        setStyleHistory(prev => prev.slice(0, -1));
        setCurrentStyle(previousStyle);

        if (mapRef.current && mapRef.current.isStyleLoaded()) {
            mapRef.current.once('style.load', () => {
                applyStylesToMap(mapRef.current, previousStyle);
            });
            mapRef.current.setStyle(previousStyle.baseStyle);
        }

        setMessages(prev => [...prev, { role: 'assistant', content: '↩️ Reverted to previous style.' }]);
    };

    // Save current style
    const handleSave = () => {
        if (!currentStyle) return;

        const styleConfig = {
            primary: primaryColor,
            secondary: secondaryColor,
            mapboxStyle: currentStyle.baseStyle,
            modifications: currentStyle.modifications,
            metadata: currentStyle.metadata
        };

        onStyleGenerated?.(styleConfig);

        setMessages(prev => [...prev, { role: 'assistant', content: '💾 Style saved! You can now use it in your theme.' }]);
    };

    // Quick actions
    const quickActions = [
        { label: 'Dark Mode', icon: Moon, action: () => { setMode('dark'); } },
        { label: 'Light Mode', icon: Sun, action: () => { setMode('light'); } },
        { label: 'Vibrant', icon: Sparkles, action: () => { setIntensity('vibrant'); } },
        { label: 'Minimal', icon: Grid3X3, action: () => { setIntensity('subtle'); setShowPOI(false); } },
        { label: 'No Labels', icon: EyeOff, action: () => { setShowLabels(false); } },
        { label: 'Real Estate', icon: Building, action: () => { setShowPOI(false); setShow3DBuildings(true); } },
    ];

    // Categories for advanced panel
    const categories = [
        { id: 'all', label: 'All', icon: Layers },
        { id: 'roads', label: 'Roads', icon: RouteIcon },
        { id: 'buildings', label: 'Buildings', icon: Building },
        { id: 'labels', label: 'Labels', icon: Type },
        { id: 'nature', label: 'Nature', icon: TreePine },
        { id: 'water', label: 'Water', icon: Droplets },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] overflow-hidden shadow-2xl flex">

                {/* Left Panel - Controls & Chat */}
                <div className="w-[420px] flex flex-col border-r border-gray-100">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                    <Wand2 className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-gray-900">Style Agent</h2>
                                    <p className="text-xs text-gray-500">AI-Powered Map Designer</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                    </div>

                    {/* Color Inputs */}
                    <div className="p-4 border-b border-gray-100 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Primary Color */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">Primary</label>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <input
                                            type="color"
                                            value={primaryColor}
                                            onChange={(e) => setPrimaryColor(e.target.value)}
                                            className="w-10 h-10 cursor-pointer opacity-0 absolute inset-0 z-10"
                                        />
                                        <div
                                            className="w-10 h-10 rounded-lg border-2 border-gray-200 shadow-sm cursor-pointer"
                                            style={{ backgroundColor: primaryColor }}
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        value={primaryColor}
                                        onChange={(e) => setPrimaryColor(e.target.value)}
                                        className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                    />
                                </div>
                            </div>

                            {/* Secondary Color */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">Secondary</label>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <input
                                            type="color"
                                            value={secondaryColor}
                                            onChange={(e) => setSecondaryColor(e.target.value)}
                                            className="w-10 h-10 cursor-pointer opacity-0 absolute inset-0 z-10"
                                        />
                                        <div
                                            className="w-10 h-10 rounded-lg border-2 border-gray-200 shadow-sm cursor-pointer"
                                            style={{ backgroundColor: secondaryColor }}
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        value={secondaryColor}
                                        onChange={(e) => setSecondaryColor(e.target.value)}
                                        className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={handleAutoGenerate}
                            disabled={isGenerating}
                            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4" />
                                    Auto-Generate Style
                                </>
                            )}
                        </button>
                    </div>

                    {/* Quick Actions */}
                    <div className="p-4 border-b border-gray-100">
                        <p className="text-xs font-medium text-gray-500 mb-2">Quick Actions</p>
                        <div className="flex flex-wrap gap-2">
                            {quickActions.map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => { action.action(); setTimeout(handleAutoGenerate, 100); }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-full transition-colors"
                                >
                                    <action.icon className="w-3.5 h-3.5" />
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Options */}
                    <div className="p-4 border-b border-gray-100 grid grid-cols-3 gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showLabels}
                                onChange={(e) => setShowLabels(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-xs text-gray-600">Labels</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showPOI}
                                onChange={(e) => setShowPOI(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-xs text-gray-600">POI</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={show3DBuildings}
                                onChange={(e) => setShow3DBuildings(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-xs text-gray-600">3D</span>
                        </label>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${msg.role === 'user'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 text-gray-800'
                                        } ${msg.isThinking ? 'animate-pulse' : ''}`}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Chat Input */}
                    <form onSubmit={handleChatSubmit} className="p-4 border-t border-gray-100">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Describe your style... (e.g., 'dark with gold roads')"
                                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                disabled={isGenerating}
                            />
                            <button
                                type="submit"
                                disabled={!chatInput.trim() || isGenerating}
                                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </form>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-gray-100 flex gap-2">
                        <button
                            onClick={handleUndo}
                            disabled={styleHistory.length < 2}
                            className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Undo2 className="w-4 h-4" />
                            Undo
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!currentStyle}
                            className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            Save Style
                        </button>
                    </div>
                </div>

                {/* Right Panel - Map Preview */}
                <div className="flex-1 relative">
                    {/* Map Container */}
                    <div ref={mapContainerRef} className="absolute inset-0" />

                    {/* Loading Overlay */}
                    {!mapLoaded && (
                        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                            <div className="text-center">
                                <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                                <p className="text-sm text-gray-500">Loading map...</p>
                            </div>
                        </div>
                    )}

                    {/* Generating Overlay */}
                    {isGenerating && mapLoaded && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center backdrop-blur-sm">
                            <div className="bg-white rounded-2xl p-6 shadow-xl text-center">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                                    <Sparkles className="w-8 h-8 text-white animate-pulse" />
                                </div>
                                <p className="font-medium text-gray-900">AI is designing your style...</p>
                                <p className="text-sm text-gray-500 mt-1">Analyzing colors and generating palette</p>
                            </div>
                        </div>
                    )}

                    {/* Style Info Badge */}
                    {currentStyle && mapLoaded && !isGenerating && (
                        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-gray-200/50">
                            <div className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                    <div className="w-6 h-6 rounded-full border-2 border-white shadow" style={{ backgroundColor: primaryColor }} />
                                    <div className="w-6 h-6 rounded-full border-2 border-white shadow" style={{ backgroundColor: secondaryColor }} />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-900">
                                        {currentStyle.metadata.mode.charAt(0).toUpperCase() + currentStyle.metadata.mode.slice(1)} Mode
                                    </p>
                                    <p className="text-[10px] text-gray-500">
                                        {currentStyle.modifications.length} modifications applied
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                    <Check className="w-3 h-3" />
                                    <span className="text-[10px] font-medium">Live</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Advanced Panel Toggle */}
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-gray-200/50 flex items-center gap-2 hover:bg-white transition-colors"
                    >
                        <Layers className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">Layers</span>
                        {showAdvanced ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>

                    {/* Advanced Layers Panel */}
                    {showAdvanced && (
                        <div className="absolute top-16 right-4 w-80 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/50 max-h-[70vh] overflow-hidden flex flex-col">
                            <div className="p-3 border-b border-gray-100">
                                <h3 className="font-semibold text-sm text-gray-900">Layer Controls</h3>
                                <p className="text-xs text-gray-500">Fine-tune individual elements</p>
                            </div>

                            {/* Category Tabs */}
                            <div className="flex gap-1 p-2 border-b border-gray-100 overflow-x-auto">
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg whitespace-nowrap transition-colors ${selectedCategory === cat.id
                                                ? 'bg-indigo-100 text-indigo-700'
                                                : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        <cat.icon className="w-3 h-3" />
                                        {cat.label}
                                    </button>
                                ))}
                            </div>

                            {/* Layer List */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {Object.entries(MAPBOX_LAYERS)
                                    .filter(([key, config]) => {
                                        if (selectedCategory === 'all') return true;
                                        if (selectedCategory === 'roads') return key.startsWith('road');
                                        if (selectedCategory === 'buildings') return key.includes('building');
                                        if (selectedCategory === 'labels') return key.startsWith('label');
                                        if (selectedCategory === 'nature') return key === 'park' || key === 'landusePitch';
                                        if (selectedCategory === 'water') return key === 'water' || key === 'waterway';
                                        return true;
                                    })
                                    .map(([key, config]) => (
                                        <div key={key} className="p-2 bg-gray-50 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium text-gray-700">{config.description}</span>
                                                <div className="w-4 h-4 rounded border border-gray-300"
                                                    style={{
                                                        backgroundColor: currentStyle?.palette?.[key] ||
                                                            config.paintProperties?.['fill-color']?.default ||
                                                            config.paintProperties?.['line-color']?.default ||
                                                            '#888'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
