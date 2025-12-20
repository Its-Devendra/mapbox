'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
    "pk.eyJ1IjoiZGV2Yml0czA5IiwiYSI6ImNtYzkyZTR2dDE0MDAyaXMzdXRndjJ0M2EifQ.Jhhx-1tf_NzrZNjGX8wp_w";

/**
 * Interactive Map Preview Component
 * Provides visual editing of camera position and map bounds
 * 
 * @param {string} mode - 'camera' or 'bounds'
 * @param {object} value - Current camera/bounds configuration
 * @param {function} onChange - Callback when map state changes
 * @param {string} mapStyle - Mapbox style URL
 * @param {array} landmarks - Array of landmark objects to display
 * @param {array} nearbyPlaces - Array of nearby place objects to display
 * @param {object} clientBuilding - Client building object to display
 */
export default function InteractiveMapPreview({
    mode = 'camera',
    value,
    onChange,
    mapStyle = 'mapbox://styles/mapbox/dark-v11',
    landmarks = [],
    nearbyPlaces = [],
    clientBuilding = null
}) {
    const mapContainerRef = useRef();
    const mapRef = useRef();
    const boundsRectRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    const [currentCamera, setCurrentCamera] = useState(null);

    // Initialize map
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const initialCenter = mode === 'camera' && value?.lng && value?.lat
            ? [value.lng, value.lat]
            : [77.08, 28.49];

        const initialZoom = mode === 'camera' && value?.zoom ? value.zoom : 12;
        const initialPitch = mode === 'camera' && value?.pitch !== undefined ? value.pitch : 70;
        const initialBearing = mode === 'camera' && value?.bearing !== undefined ? value.bearing : -20;

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: mapStyle,
            center: initialCenter,
            zoom: initialZoom,
            pitch: initialPitch,
            bearing: initialBearing,
            dragRotate: true,
            pitchWithRotate: true
        });

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.on('load', () => {
            setIsReady(true);

            // Add client building marker if exists
            if (clientBuilding && clientBuilding.coordinates) {
                new mapboxgl.Marker({ color: '#10b981', scale: 1.2 })
                    .setLngLat(clientBuilding.coordinates)
                    .setPopup(new mapboxgl.Popup().setHTML(`
                        <div class="font-semibold">${clientBuilding.name || 'Client Building'}</div>
                        <div class="text-xs text-gray-600">🏢 Main Building</div>
                    `))
                    .addTo(map);
            }

            // Add landmark markers
            landmarks.forEach(landmark => {
                if (landmark.longitude && landmark.latitude) {
                    new mapboxgl.Marker({ color: '#3b82f6', scale: 0.9 })
                        .setLngLat([landmark.longitude, landmark.latitude])
                        .setPopup(new mapboxgl.Popup().setHTML(`
                            <div class="font-semibold">${landmark.title}</div>
                            <div class="text-xs text-gray-600">🗺️ Landmark</div>
                        `))
                        .addTo(map);
                }
            });

            // Add nearby place markers
            nearbyPlaces.forEach(place => {
                if (place.longitude && place.latitude) {
                    new mapboxgl.Marker({ color: '#8b5cf6', scale: 0.8 })
                        .setLngLat([place.longitude, place.latitude])
                        .setPopup(new mapboxgl.Popup().setHTML(`
                            <div class="font-semibold">${place.title}</div>
                            <div class="text-xs text-gray-600">📍 Nearby Place</div>
                        `))
                        .addTo(map);
                }
            });

            // Initialize bounds rectangle in bounds mode
            if (mode === 'bounds') {
                initializeBoundsEditor(map);
            }
        });

        // Track camera position changes in camera mode
        if (mode === 'camera') {
            const updateCamera = () => {
                const center = map.getCenter();
                const camera = {
                    lat: parseFloat(center.lat.toFixed(6)),
                    lng: parseFloat(center.lng.toFixed(6)),
                    zoom: parseFloat(map.getZoom().toFixed(2)),
                    pitch: parseFloat(map.getPitch().toFixed(1)),
                    bearing: parseFloat(map.getBearing().toFixed(1))
                };
                setCurrentCamera(camera);
            };

            map.on('move', updateCamera);
            map.on('zoom', updateCamera);
            map.on('rotate', updateCamera);
            map.on('pitch', updateCamera);

            // Initial camera state
            updateCamera();
        }

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, [mode, mapStyle]);

    // Initialize bounds editor
    const initializeBoundsEditor = (map) => {
        // Add source and layer for bounds rectangle
        map.addSource('bounds-rect', {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[]]
                }
            }
        });

        // Add fill layer
        map.addLayer({
            id: 'bounds-fill',
            type: 'fill',
            source: 'bounds-rect',
            paint: {
                'fill-color': '#8b5cf6',
                'fill-opacity': 0.15
            }
        });

        // Add outline layer
        map.addLayer({
            id: 'bounds-outline',
            type: 'line',
            source: 'bounds-rect',
            paint: {
                'line-color': '#8b5cf6',
                'line-width': 3,
                'line-dasharray': [2, 2]
            }
        });

        // If bounds exist, draw them
        if (value?.southWest && value?.northEast) {
            updateBoundsRectangle(map, value.southWest, value.northEast);
        }

        // TWO-CLICK MODE: First click = corner 1, Second click = corner 2
        let firstCorner = null;
        let tempMarker = null;

        map.on('click', (e) => {
            const clickPoint = [e.lngLat.lng, e.lngLat.lat];

            if (!firstCorner) {
                // First click - set first corner
                firstCorner = clickPoint;

                // Add visual marker for first corner
                if (tempMarker) tempMarker.remove();
                tempMarker = new mapboxgl.Marker({ color: '#8b5cf6' })
                    .setLngLat(clickPoint)
                    .addTo(map);

                // Update instruction text via state
                setIsReady('click-second');
            } else {
                // Second click - complete the rectangle
                const sw = [
                    Math.min(firstCorner[0], clickPoint[0]),
                    Math.min(firstCorner[1], clickPoint[1])
                ];
                const ne = [
                    Math.max(firstCorner[0], clickPoint[0]),
                    Math.max(firstCorner[1], clickPoint[1])
                ];

                // Update rectangle
                updateBoundsRectangle(map, sw, ne);

                // Remove temp marker
                if (tempMarker) {
                    tempMarker.remove();
                    tempMarker = null;
                }

                // Emit bounds change
                if (onChange) {
                    onChange({
                        southWest: sw,
                        northEast: ne
                    });
                }

                // Reset for next rectangle
                firstCorner = null;
                setIsReady(true);
            }
        });

        // Store reference for "Use Current View" button
        boundsRectRef.current = { map, updateBoundsRectangle };
    };

    // Update bounds rectangle on map
    const updateBoundsRectangle = (map, sw, ne) => {
        const coordinates = [[
            sw,
            [ne[0], sw[1]],
            ne,
            [sw[0], ne[1]],
            sw
        ]];

        map.getSource('bounds-rect').setData({
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates
            }
        });
    };

    // "Set Camera" button handler
    const handleSetCamera = () => {
        if (mode === 'camera' && currentCamera && onChange) {
            onChange(currentCamera);
        }
    };

    // Clear bounds
    const handleClearBounds = () => {
        if (mode === 'bounds' && mapRef.current && onChange) {
            updateBoundsRectangle(mapRef.current, [0, 0], [0, 0]);
            onChange({ southWest: null, northEast: null });
            setIsReady(true);
        }
    };

    // Use current map view as bounds (easiest method!)
    const handleUseCurrentView = () => {
        if (mode === 'bounds' && mapRef.current && onChange) {
            const bounds = mapRef.current.getBounds();
            const sw = [bounds.getWest(), bounds.getSouth()];
            const ne = [bounds.getEast(), bounds.getNorth()];

            updateBoundsRectangle(mapRef.current, sw, ne);
            onChange({
                southWest: sw,
                northEast: ne
            });

            console.log('✅ Bounds set from current view:', { sw, ne });
        }
    };

    return (
        <div className="space-y-3">
            <div
                ref={mapContainerRef}
                className="w-full h-96 rounded-lg border-2 border-indigo-400 shadow-lg overflow-hidden"
                style={{ cursor: mode === 'bounds' ? 'crosshair' : 'grab' }}
            />

            {mode === 'camera' && currentCamera && (
                <div className="space-y-2">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <div>
                                <span className="text-gray-600 font-medium">Latitude:</span>
                                <div className="font-mono text-indigo-700 font-semibold">{currentCamera.lat}°</div>
                            </div>
                            <div>
                                <span className="text-gray-600 font-medium">Longitude:</span>
                                <div className="font-mono text-indigo-700 font-semibold">{currentCamera.lng}°</div>
                            </div>
                            <div>
                                <span className="text-gray-600 font-medium">Zoom:</span>
                                <div className="font-mono text-indigo-700 font-semibold">{currentCamera.zoom}</div>
                            </div>
                            <div>
                                <span className="text-gray-600 font-medium">Pitch:</span>
                                <div className="font-mono text-indigo-700 font-semibold">{currentCamera.pitch}°</div>
                            </div>
                            <div>
                                <span className="text-gray-600 font-medium">Bearing:</span>
                                <div className="font-mono text-indigo-700 font-semibold">{currentCamera.bearing}°</div>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleSetCamera}
                        className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Set Camera Position</span>
                    </button>

                    <p className="text-xs text-gray-600 italic text-center">
                        🎥 Move, zoom, rotate, and tilt the map to find your perfect angle, then click "Set Camera Position"
                    </p>
                </div>
            )}

            {mode === 'bounds' && (
                <div className="space-y-3">
                    {/* Easy Method: Use Current View */}
                    <button
                        type="button"
                        onClick={handleUseCurrentView}
                        className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>📍 Use Current View as Bounds</span>
                    </button>

                    <div className="text-center text-xs text-gray-500">
                        <strong className="text-purple-600">Easiest:</strong> Zoom/pan to desired area, then click button above
                    </div>

                    {/* Instructions based on state */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
                        {isReady === 'click-second' ? (
                            <div className="text-purple-700 font-medium text-center">
                                👆 <strong>Now click the opposite corner</strong> to complete the rectangle
                            </div>
                        ) : (
                            <div className="text-gray-700">
                                <strong className="text-purple-700">Two-click method:</strong><br />
                                1️⃣ Click first corner → 2️⃣ Click opposite corner
                            </div>
                        )}
                    </div>

                    {/* Show current bounds if set */}
                    {value?.southWest && value?.northEast && (
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-sm font-mono">
                            <div className="text-green-700 font-semibold mb-1">✅ Bounds Set:</div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-gray-600">SW:</span>
                                    <div className="text-green-700">{value.southWest[1].toFixed(4)}, {value.southWest[0].toFixed(4)}</div>
                                </div>
                                <div>
                                    <span className="text-gray-600">NE:</span>
                                    <div className="text-green-700">{value.northEast[1].toFixed(4)}, {value.northEast[0].toFixed(4)}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Clear bounds button */}
                    <button
                        type="button"
                        onClick={handleClearBounds}
                        className="w-full px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors"
                    >
                        🗑️ Clear Bounds
                    </button>
                </div>
            )}
        </div>
    );
}
