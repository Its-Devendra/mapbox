'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Send,
    Sparkles,
    Loader2,
    Palette,
    Route,
    Building2,
    TreePine,
    Moon,
    Sun,
    Wand2,
    RotateCcw,
    Download,
    Save,
    X
} from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
    "pk.eyJ1IjoiZGV2Yml0czA5IiwiYSI6ImNtYzkyZTR2dDE0MDAyaXMzdXRndjJ0M2EifQ.Jhhx-1tf_NzrZNfGX8wp_w";

// ============================================================================
// MAPBOX LAYER DEFINITIONS - Complete control over map styling
// ============================================================================
const STYLE_LAYERS = {
    // Water
    water: {
        layers: ['water'],
        paint: { 'fill-color': true, 'fill-opacity': true }
    },
    // Land & Background
    background: {
        layers: ['background'],
        paint: { 'background-color': true }
    },
    land: {
        layers: ['land', 'landcover'],
        paint: { 'fill-color': true }
    },
    // Roads
    highway: {
        layers: ['road-motorway-trunk', 'road-motorway-trunk-case'],
        paint: { 'line-color': true, 'line-width': true }
    },
    primaryRoad: {
        layers: ['road-primary', 'road-primary-case'],
        paint: { 'line-color': true }
    },
    secondaryRoad: {
        layers: ['road-secondary-tertiary', 'road-secondary-tertiary-case'],
        paint: { 'line-color': true }
    },
    localRoad: {
        layers: ['road-street', 'road-minor'],
        paint: { 'line-color': true }
    },
    // Buildings
    building: {
        layers: ['building'],
        paint: { 'fill-color': true, 'fill-opacity': true }
    },
    building3d: {
        layers: ['3d-buildings', 'building-extrusion'],
        paint: { 'fill-extrusion-color': true, 'fill-extrusion-opacity': true }
    },
    // Parks & Nature
    park: {
        layers: ['landuse-park', 'park'],
        paint: { 'fill-color': true }
    },
    // Labels
    placeLabel: {
        layers: ['place-label', 'settlement-label', 'place-city-label'],
        paint: { 'text-color': true, 'text-halo-color': true }
    },
    roadLabel: {
        layers: ['road-label'],
        paint: { 'text-color': true, 'text-halo-color': true }
    },
    poiLabel: {
        layers: ['poi-label'],
        layout: { 'visibility': true }
    }
};

// ============================================================================
// AI STYLE GENERATOR - Interprets prompts and generates styles
// ============================================================================
async function generateStyleFromAI(prompt) {
    const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    const systemPrompt = `You are an expert Mapbox map style designer. Given a user's natural language description, generate a JSON object with map style modifications.

RESPOND ONLY WITH VALID JSON - no markdown, no explanations.

The JSON must have this structure:
{
  "baseStyle": "light-v11" or "dark-v11",
  "name": "Short style name",
  "description": "Brief description",
  "colors": {
    "water": "#hexcolor",
    "land": "#hexcolor",
    "background": "#hexcolor",
    "highway": "#hexcolor",
    "primaryRoad": "#hexcolor",
    "secondaryRoad": "#hexcolor",
    "localRoad": "#hexcolor",
    "building": "#hexcolor",
    "park": "#hexcolor",
    "labelText": "#hexcolor",
    "labelHalo": "#hexcolor"
  },
  "visibility": {
    "poi": true or false,
    "roadLabels": true or false,
    "placeLabels": true or false
  },
  "opacity": {
    "building": 0.0 to 1.0,
    "water": 0.0 to 1.0
  }
}

Examples:
- "tech vibe" = dark base, neon blue/purple accents, hide POIs
- "real estate" = clean light base, prominent buildings, hide POIs
- "nature focus" = green parks prominent, subtle roads
- "night mode" = dark base, subtle gray roads, blue water
- "minimal" = very subtle colors, hide most labels`;

    if (!GEMINI_KEY) {
        // Fallback: Local interpretation
        console.log('No Gemini API key found, using local interpretation');
        return interpretPromptLocally(prompt);
    }

    // Try multiple model endpoints
    const models = [
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro'
    ];

    for (const model of models) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: `${systemPrompt}\n\nUser request: "${prompt}"` }]
                        }],
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 1000
                        }
                    })
                }
            );

            if (!response.ok) {
                console.warn(`Model ${model} failed with status ${response.status}, trying next...`);
                continue; // Try next model
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                console.log(`Successfully generated style using ${model}`);
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.warn(`Model ${model} error:`, error.message);
            continue; // Try next model
        }
    }

    // All models failed, use local fallback
    console.log('All Gemini models failed, using local interpretation');
    return interpretPromptLocally(prompt);
}

// Local fallback when AI is not available
function interpretPromptLocally(prompt) {
    const lower = prompt.toLowerCase();

    // Detect theme keywords
    const isDark = lower.includes('dark') || lower.includes('night') || lower.includes('tech') || lower.includes('neon');
    const isMinimal = lower.includes('minimal') || lower.includes('clean') || lower.includes('simple');
    const isNature = lower.includes('nature') || lower.includes('green') || lower.includes('forest');
    const isRealEstate = lower.includes('real estate') || lower.includes('property') || lower.includes('building');

    if (isDark) {
        return {
            baseStyle: 'dark-v11',
            name: 'Dark Tech',
            description: 'Dark theme with tech vibes',
            colors: {
                water: '#1a365d',
                land: '#1a1a2e',
                background: '#0f0f1a',
                highway: '#6366f1',
                primaryRoad: '#4f46e5',
                secondaryRoad: '#3730a3',
                localRoad: '#2d2d4a',
                building: '#2d2d4a',
                park: '#1e3a2f',
                labelText: '#e2e8f0',
                labelHalo: '#0f0f1a'
            },
            visibility: { poi: false, roadLabels: true, placeLabels: true },
            opacity: { building: 0.8, water: 1 }
        };
    }

    if (isMinimal) {
        return {
            baseStyle: 'light-v11',
            name: 'Minimal Clean',
            description: 'Clean minimal design',
            colors: {
                water: '#dbeafe',
                land: '#f8fafc',
                background: '#ffffff',
                highway: '#94a3b8',
                primaryRoad: '#cbd5e1',
                secondaryRoad: '#e2e8f0',
                localRoad: '#f1f5f9',
                building: '#e2e8f0',
                park: '#dcfce7',
                labelText: '#64748b',
                labelHalo: '#ffffff'
            },
            visibility: { poi: false, roadLabels: false, placeLabels: true },
            opacity: { building: 0.5, water: 0.8 }
        };
    }

    if (isNature) {
        return {
            baseStyle: 'light-v11',
            name: 'Nature Focus',
            description: 'Nature and green spaces emphasized',
            colors: {
                water: '#0ea5e9',
                land: '#fef9c3',
                background: '#fffbeb',
                highway: '#a3a3a3',
                primaryRoad: '#d4d4d4',
                secondaryRoad: '#e5e5e5',
                localRoad: '#f5f5f5',
                building: '#d6d3d1',
                park: '#22c55e',
                labelText: '#374151',
                labelHalo: '#ffffff'
            },
            visibility: { poi: true, roadLabels: true, placeLabels: true },
            opacity: { building: 0.4, water: 1 }
        };
    }

    if (isRealEstate) {
        return {
            baseStyle: 'light-v11',
            name: 'Real Estate',
            description: 'Clean focus on buildings and streets',
            colors: {
                water: '#bfdbfe',
                land: '#fafaf9',
                background: '#ffffff',
                highway: '#f59e0b',
                primaryRoad: '#fbbf24',
                secondaryRoad: '#fcd34d',
                localRoad: '#fef3c7',
                building: '#1e3a5f',
                park: '#86efac',
                labelText: '#1f2937',
                labelHalo: '#ffffff'
            },
            visibility: { poi: false, roadLabels: true, placeLabels: true },
            opacity: { building: 0.9, water: 1 }
        };
    }

    // Default style
    return {
        baseStyle: 'light-v11',
        name: 'Custom Style',
        description: 'Generated from your prompt',
        colors: {
            water: '#3b82f6',
            land: '#f5f5f4',
            background: '#fafaf9',
            highway: '#f97316',
            primaryRoad: '#fb923c',
            secondaryRoad: '#fdba74',
            localRoad: '#fff7ed',
            building: '#d6d3d1',
            park: '#4ade80',
            labelText: '#1f2937',
            labelHalo: '#ffffff'
        },
        visibility: { poi: true, roadLabels: true, placeLabels: true },
        opacity: { building: 0.7, water: 1 }
    };
}

// Apply style to map
function applyStyleToMap(map, styleConfig) {
    if (!map || !map.isStyleLoaded()) return;

    const { colors, visibility, opacity } = styleConfig;

    // Helper to safely set paint property
    const setPaint = (layers, property, value) => {
        layers.forEach(layerId => {
            try {
                if (map.getLayer(layerId)) {
                    map.setPaintProperty(layerId, property, value);
                }
            } catch (e) {
                // Layer might not exist - that's okay
            }
        });
    };

    // Helper to safely set layout property  
    const setLayout = (layers, property, value) => {
        layers.forEach(layerId => {
            try {
                if (map.getLayer(layerId)) {
                    map.setLayoutProperty(layerId, property, value);
                }
            } catch (e) {
                // Layer might not exist
            }
        });
    };

    // Apply colors
    if (colors.water) setPaint(['water'], 'fill-color', colors.water);
    if (colors.background) setPaint(['background'], 'background-color', colors.background);
    if (colors.land) setPaint(['land', 'landcover'], 'fill-color', colors.land);

    // Roads
    if (colors.highway) setPaint(['road-motorway-trunk', 'road-motorway'], 'line-color', colors.highway);
    if (colors.primaryRoad) setPaint(['road-primary'], 'line-color', colors.primaryRoad);
    if (colors.secondaryRoad) setPaint(['road-secondary-tertiary'], 'line-color', colors.secondaryRoad);
    if (colors.localRoad) setPaint(['road-street', 'road-minor'], 'line-color', colors.localRoad);

    // Buildings
    if (colors.building) {
        setPaint(['building'], 'fill-color', colors.building);
        setPaint(['building-extrusion', '3d-buildings'], 'fill-extrusion-color', colors.building);
    }
    if (opacity?.building) {
        setPaint(['building'], 'fill-opacity', opacity.building);
        setPaint(['building-extrusion', '3d-buildings'], 'fill-extrusion-opacity', opacity.building);
    }

    // Parks
    if (colors.park) setPaint(['landuse-park', 'park'], 'fill-color', colors.park);

    // Labels
    if (colors.labelText) {
        setPaint(['place-label', 'settlement-label', 'road-label', 'poi-label'], 'text-color', colors.labelText);
    }
    if (colors.labelHalo) {
        setPaint(['place-label', 'settlement-label', 'road-label', 'poi-label'], 'text-halo-color', colors.labelHalo);
    }

    // Visibility
    if (visibility) {
        if (!visibility.poi) {
            setLayout(['poi-label'], 'visibility', 'none');
        } else {
            setLayout(['poi-label'], 'visibility', 'visible');
        }
        if (!visibility.roadLabels) {
            setLayout(['road-label'], 'visibility', 'none');
        } else {
            setLayout(['road-label'], 'visibility', 'visible');
        }
    }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function StyleBuilderAgent({ onStyleGenerated, onClose }) {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentStyle, setCurrentStyle] = useState(null);
    const [styleHistory, setStyleHistory] = useState([]);
    const [mapLoaded, setMapLoaded] = useState(false);

    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);

    // Quick action presets
    const quickActions = [
        { label: 'Dark tech vibe', icon: Moon, prompt: 'Create a dark tech vibe map with neon accents' },
        { label: 'Minimal clean', icon: Sparkles, prompt: 'Create a minimal clean map style' },
        { label: 'Real estate focus', icon: Building2, prompt: 'Create a real estate focused map' },
        { label: 'Nature explorer', icon: TreePine, prompt: 'Create a nature focused map with green emphasis' },
        { label: 'Bright daytime', icon: Sun, prompt: 'Create a bright daytime map' },
        { label: 'Surprise me', icon: Wand2, prompt: 'Create a unique creative map style' },
    ];

    // Initialize map
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        // Small delay to ensure container has proper dimensions
        const timer = setTimeout(() => {
            mapRef.current = new mapboxgl.Map({
                container: mapContainerRef.current,
                style: 'mapbox://styles/mapbox/light-v11',
                center: [77.08, 28.49],
                zoom: 12,
                pitch: 45,
                interactive: true
            });

            mapRef.current.on('load', () => {
                setMapLoaded(true);
                // Trigger resize to ensure proper rendering
                mapRef.current.resize();
            });
        }, 100);

        return () => {
            clearTimeout(timer);
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Generate style from prompt
    const handleGenerate = useCallback(async (customPrompt) => {
        const promptToUse = customPrompt || prompt;
        if (!promptToUse.trim()) return;

        setIsGenerating(true);

        try {
            const styleConfig = await generateStyleFromAI(promptToUse);
            setCurrentStyle(styleConfig);
            setStyleHistory(prev => [...prev, styleConfig]);

            // Apply base style first, then modifications
            if (mapRef.current) {
                const baseStyleUrl = `mapbox://styles/mapbox/${styleConfig.baseStyle}`;

                mapRef.current.once('style.load', () => {
                    setTimeout(() => {
                        applyStyleToMap(mapRef.current, styleConfig);
                    }, 500);
                });

                mapRef.current.setStyle(baseStyleUrl);
            }
        } catch (error) {
            console.error('Failed to generate style:', error);
        } finally {
            setIsGenerating(false);
        }
    }, [prompt]);

    // Handle quick action click
    const handleQuickAction = (action) => {
        setPrompt(action.prompt);
        handleGenerate(action.prompt);
    };

    // Reset to default
    const handleReset = () => {
        setCurrentStyle(null);
        if (mapRef.current) {
            mapRef.current.setStyle('mapbox://styles/mapbox/light-v11');
        }
    };

    // Save style
    const handleSave = () => {
        if (!currentStyle) return;

        onStyleGenerated?.({
            name: currentStyle.name,
            mapboxStyle: `mapbox://styles/mapbox/${currentStyle.baseStyle}`,
            styleConfig: currentStyle,
            primary: currentStyle.colors.highway,
            secondary: currentStyle.colors.labelText
        });
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Palette className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900">Map Style Builder</h2>
                            <p className="text-xs text-gray-500">AI-powered styling for Mapbox</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Left Side - Map Preview */}
                    <div className="flex-1 relative bg-gray-100" style={{ minHeight: '400px' }}>
                        <div
                            ref={mapContainerRef}
                            className="absolute inset-0 w-full h-full"
                            style={{ minHeight: '400px' }}
                        />

                        {/* Loading overlay */}
                        {!mapLoaded && (
                            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
                                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                            </div>
                        )}

                        {/* Generating overlay */}
                        {isGenerating && (
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20">
                                <div className="bg-white rounded-2xl p-6 shadow-xl text-center">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
                                        <Sparkles className="w-8 h-8 text-white" />
                                    </div>
                                    <p className="font-medium text-gray-900">Generating your style...</p>
                                    <p className="text-sm text-gray-500 mt-1">AI is designing your map</p>
                                </div>
                            </div>
                        )}

                        {/* Style info badge */}
                        {currentStyle && !isGenerating && (
                            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg z-10">
                                <p className="font-medium text-gray-900 text-sm">{currentStyle.name}</p>
                                <p className="text-xs text-gray-500">{currentStyle.description}</p>
                            </div>
                        )}
                    </div>

                    {/* Right Side - Controls */}
                    <div className="w-[380px] flex flex-col border-l border-gray-100">

                        {/* Prompt Area */}
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                What style would you like?
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Describe your ideal map style in natural language
                            </p>

                            <div className="relative">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="e.g., Create a dark tech vibe map with neon blue roads..."
                                    className="w-full h-24 px-4 py-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm"
                                    disabled={isGenerating}
                                />
                                <button
                                    onClick={() => handleGenerate()}
                                    disabled={!prompt.trim() || isGenerating}
                                    className="absolute bottom-3 right-3 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isGenerating ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="p-6 border-b border-gray-100 flex-1 overflow-y-auto">
                            <p className="text-xs font-medium text-gray-500 mb-3">QUICK STYLES</p>
                            <div className="grid grid-cols-2 gap-2">
                                {quickActions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleQuickAction(action)}
                                        disabled={isGenerating}
                                        className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-left transition-colors disabled:opacity-50"
                                    >
                                        <action.icon className="w-4 h-4 text-gray-600" />
                                        <span className="text-sm text-gray-700">{action.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Color preview */}
                            {currentStyle && (
                                <div className="mt-6">
                                    <p className="text-xs font-medium text-gray-500 mb-3">APPLIED COLORS</p>
                                    <div className="grid grid-cols-5 gap-2">
                                        {Object.entries(currentStyle.colors).slice(0, 10).map(([key, color]) => (
                                            <div key={key} className="text-center">
                                                <div
                                                    className="w-8 h-8 rounded-lg border border-gray-200 mx-auto mb-1"
                                                    style={{ backgroundColor: color }}
                                                />
                                                <span className="text-[10px] text-gray-500">{key.slice(0, 4)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom Actions */}
                        <div className="p-4 border-t border-gray-100 flex gap-2">
                            <button
                                onClick={handleReset}
                                disabled={!currentStyle}
                                className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Reset
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!currentStyle}
                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                            >
                                <Save className="w-4 h-4" />
                                Save Style
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
