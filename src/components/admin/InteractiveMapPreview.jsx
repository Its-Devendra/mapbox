'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
    "pk.eyJ1IjoiZGV2Yml0czA5IiwiYSI6ImNtYzkyZTR2dDE0MDAyaXMzdXRndjJ0M2EifQ.Jhhx-1tf_NzrZNfGX8wp_w";

/**
 * Create a custom HTML marker element from SVG icon
 */
function createCustomMarkerElement(icon, width = 32, height = 32, color = null) {
    const el = document.createElement('div');
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.style.cursor = 'pointer';

    // Check if icon is SVG content
    if (icon && typeof icon === 'string' && (icon.trim().toLowerCase().startsWith('<svg') || icon.includes('<svg'))) {
        el.innerHTML = icon;
        const svg = el.querySelector('svg');
        if (svg) {
            svg.style.width = '100%';
            svg.style.height = '100%';
            if (color) {
                svg.style.fill = color;
                svg.style.color = color;
            }
        }
    } else {
        // Fallback to a colored circle if no valid SVG
        el.style.backgroundColor = color || '#3b82f6';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
    }

    return el;
}

/**
 * Generate a GeoJSON circle polygon from center point and radius
 * @param {number} centerLng - Center longitude
 * @param {number} centerLat - Center latitude
 * @param {number} radiusKm - Radius in kilometers
 * @param {number} points - Number of points to use (more = smoother circle)
 * @returns {object} GeoJSON Feature with Polygon geometry
 */
function generateCircleGeoJSON(centerLng, centerLat, radiusKm, points = 64) {
    const coordinates = [];
    const earthRadiusKm = 6371;

    for (let i = 0; i <= points; i++) {
        const angle = (i * 360) / points;
        const radians = angle * Math.PI / 180;

        // Calculate offset using Haversine formula inverse
        const latOffset = (radiusKm / earthRadiusKm) * (180 / Math.PI);
        const lngOffset = (radiusKm / earthRadiusKm) * (180 / Math.PI) / Math.cos(centerLat * Math.PI / 180);

        const lat = centerLat + latOffset * Math.sin(radians);
        const lng = centerLng + lngOffset * Math.cos(radians);

        coordinates.push([lng, lat]);
    }

    return {
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'Polygon',
            coordinates: [coordinates]
        }
    };
}

/**
 * Interactive Map Preview Component
 * Provides visual editing of camera position, map bounds, and distance radius
 * 
 * @param {string} mode - 'camera', 'bounds', or 'distance'
 * @param {object} value - Current camera/bounds configuration
 * @param {number} distanceKm - Distance in km for 'distance' mode circle
 * @param {object} panCenter - Custom center point {lat, lng} for distance mode (optional)
 * @param {function} onChange - Callback when map state changes
 * @param {string} mapStyle - Mapbox style URL
 * @param {array} landmarks - Array of landmark objects to display
 * @param {array} nearbyPlaces - Array of nearby place objects to display
 * @param {object} clientBuilding - Client building object to display
 */
export default function InteractiveMapPreview({
    mode = 'camera',
    value,
    distanceKm = null,
    panCenter = null,
    zoomSettings = null, // {minZoom, maxZoom, defaultZoom} for zoom mode
    onChange,
    mapStyle = 'mapbox://styles/mapbox/dark-v11',
    landmarks = [],
    nearbyPlaces = [],
    clientBuilding = null
}) {
    const mapContainerRef = useRef();
    const mapRef = useRef();
    const boundsRectRef = useRef(null);
    const distanceCenterRef = useRef(null); // Draggable center marker for distance mode
    const [isReady, setIsReady] = useState(false);
    const [currentCamera, setCurrentCamera] = useState(null);
    const [currentZoom, setCurrentZoom] = useState(null); // For zoom mode
    const [enforceLimits, setEnforceLimits] = useState(false); // Toggle for verifying zoom limits

    // Scale factor for preview - icons are designed for full map, scale them down for preview
    const PREVIEW_SCALE = 0.6;

    // Initialize map
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        // Priority: 1) Provided value, 2) Client building location, 3) Default Gurugram
        let initialCenter = [77.08, 28.49]; // Default fallback

        if (mode === 'camera' && value?.lng && value?.lat) {
            initialCenter = [value.lng, value.lat];
        } else if (clientBuilding && clientBuilding.coordinates) {
            // Auto-center on client building when opening
            initialCenter = clientBuilding.coordinates;
        }

        // For zoom mode, use zoomSettings; for camera mode, use value
        let initialZoom = 15;
        if (mode === 'zoom' && zoomSettings?.defaultZoom) {
            initialZoom = zoomSettings.defaultZoom;
        } else if (mode === 'camera' && value?.zoom) {
            initialZoom = value.zoom;
        }

        const initialPitch = mode === 'camera' && value?.pitch !== undefined ? value.pitch : (mode === 'zoom' ? 0 : 70);
        const initialBearing = mode === 'camera' && value?.bearing !== undefined ? value.bearing : 0;

        // In zoom mode, allow toggle between FREE scrolling (to set values) and STRICT limits (to verify)
        // Default is FREE so users can select any value
        const minZoom = (mode === 'zoom' && enforceLimits && zoomSettings?.minZoom) ? zoomSettings.minZoom : 0;
        const maxZoom = (mode === 'zoom' && enforceLimits && zoomSettings?.maxZoom) ? zoomSettings.maxZoom : 22;

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: mapStyle,
            center: initialCenter,
            zoom: initialZoom,
            minZoom: minZoom,
            maxZoom: maxZoom,
            pitch: initialPitch,
            bearing: initialBearing,
            dragRotate: mode !== 'zoom',
            pitchWithRotate: mode !== 'zoom'
        });

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.on('load', () => {
            setIsReady(true);

            // Add client building marker if exists (with custom icon if available)
            if (clientBuilding && clientBuilding.coordinates) {
                const buildingIcon = clientBuilding.icon;
                const iconWidth = Math.round((clientBuilding.iconWidth || 40) * PREVIEW_SCALE);
                const iconHeight = Math.round((clientBuilding.iconHeight || 40) * PREVIEW_SCALE);

                if (buildingIcon && typeof buildingIcon === 'string' && buildingIcon.includes('<svg')) {
                    // Use custom SVG icon
                    const el = createCustomMarkerElement(buildingIcon, iconWidth, iconHeight, '#10b981');
                    new mapboxgl.Marker({ element: el })
                        .setLngLat(clientBuilding.coordinates)
                        .setPopup(new mapboxgl.Popup().setHTML(`
                            <div class="font-semibold">${clientBuilding.name || 'Client Building'}</div>
                            <div class="text-xs text-gray-600">🏢 Main Building</div>
                        `))
                        .addTo(map);
                } else {
                    // Fallback to default marker
                    new mapboxgl.Marker({ color: '#10b981', scale: 0.8 })
                        .setLngLat(clientBuilding.coordinates)
                        .setPopup(new mapboxgl.Popup().setHTML(`
                            <div class="font-semibold">${clientBuilding.name || 'Client Building'}</div>
                            <div class="text-xs text-gray-600">🏢 Main Building</div>
                        `))
                        .addTo(map);
                }
            }

            // Add landmark markers with real icons
            landmarks.forEach(landmark => {
                if (landmark.longitude && landmark.latitude) {
                    // Get icon from landmark or category
                    const icon = landmark.icon || landmark.category?.icon;
                    const iconWidth = Math.round((landmark.iconWidth || landmark.category?.defaultIconWidth || 32) * PREVIEW_SCALE);
                    const iconHeight = Math.round((landmark.iconHeight || landmark.category?.defaultIconHeight || 32) * PREVIEW_SCALE);

                    if (icon && typeof icon === 'string' && icon.includes('<svg')) {
                        // Use custom SVG icon
                        const el = createCustomMarkerElement(icon, iconWidth, iconHeight);
                        new mapboxgl.Marker({ element: el })
                            .setLngLat([landmark.longitude, landmark.latitude])
                            .setPopup(new mapboxgl.Popup().setHTML(`
                                <div class="font-semibold">${landmark.title}</div>
                                <div class="text-xs text-gray-600">${landmark.category?.name || '🗺️ Landmark'}</div>
                            `))
                            .addTo(map);
                    } else {
                        // Fallback to default marker
                        new mapboxgl.Marker({ color: '#3b82f6', scale: 0.7 })
                            .setLngLat([landmark.longitude, landmark.latitude])
                            .setPopup(new mapboxgl.Popup().setHTML(`
                                <div class="font-semibold">${landmark.title}</div>
                                <div class="text-xs text-gray-600">${landmark.category?.name || '🗺️ Landmark'}</div>
                            `))
                            .addTo(map);
                    }
                }
            });

            // Add nearby place markers with real icons
            nearbyPlaces.forEach(place => {
                if (place.longitude && place.latitude) {
                    // Get icon from place or category
                    const icon = place.icon || place.category?.icon;
                    const iconWidth = Math.round((place.iconWidth || place.category?.defaultIconWidth || 28) * PREVIEW_SCALE);
                    const iconHeight = Math.round((place.iconHeight || place.category?.defaultIconHeight || 28) * PREVIEW_SCALE);
                    const color = place.color || '#8b5cf6';

                    if (icon && typeof icon === 'string' && icon.includes('<svg')) {
                        // Use custom SVG icon
                        const el = createCustomMarkerElement(icon, iconWidth, iconHeight, color);
                        new mapboxgl.Marker({ element: el })
                            .setLngLat([place.longitude, place.latitude])
                            .setPopup(new mapboxgl.Popup().setHTML(`
                                <div class="font-semibold">${place.title}</div>
                                <div class="text-xs text-gray-600">${place.category?.name || '📍 Nearby Place'}</div>
                            `))
                            .addTo(map);
                    } else {
                        // Fallback to default marker
                        new mapboxgl.Marker({ color: color, scale: 0.8 })
                            .setLngLat([place.longitude, place.latitude])
                            .setPopup(new mapboxgl.Popup().setHTML(`
                                <div class="font-semibold">${place.title}</div>
                                <div class="text-xs text-gray-600">${place.category?.name || '📍 Nearby Place'}</div>
                            `))
                            .addTo(map);
                    }
                }
            });

            // Initialize bounds rectangle in bounds mode
            if (mode === 'bounds') {
                initializeBoundsEditor(map);
            }

            // Initialize distance circle in distance mode
            if (mode === 'distance' && clientBuilding?.coordinates && distanceKm) {
                // Use custom panCenter if provided, otherwise fall back to clientBuilding
                const centerLng = panCenter?.lng ?? clientBuilding.coordinates[0];
                const centerLat = panCenter?.lat ?? clientBuilding.coordinates[1];

                // Generate and add circle
                const circleGeoJSON = generateCircleGeoJSON(centerLng, centerLat, distanceKm);

                map.addSource('distance-circle', {
                    type: 'geojson',
                    data: circleGeoJSON
                });

                // Add fill layer (semi-transparent)
                map.addLayer({
                    id: 'distance-circle-fill',
                    type: 'fill',
                    source: 'distance-circle',
                    paint: {
                        'fill-color': '#8b5cf6',
                        'fill-opacity': 0.15
                    }
                });

                // Add outline layer
                map.addLayer({
                    id: 'distance-circle-outline',
                    type: 'line',
                    source: 'distance-circle',
                    paint: {
                        'line-color': '#8b5cf6',
                        'line-width': 3,
                        'line-dasharray': [3, 2]
                    }
                });

                // Create draggable center marker
                const centerMarkerEl = document.createElement('div');
                centerMarkerEl.style.width = '24px';
                centerMarkerEl.style.height = '24px';
                centerMarkerEl.style.backgroundColor = '#8b5cf6';
                centerMarkerEl.style.borderRadius = '50%';
                centerMarkerEl.style.border = '3px solid white';
                centerMarkerEl.style.boxShadow = '0 3px 8px rgba(0,0,0,0.4)';
                centerMarkerEl.style.cursor = 'move';
                centerMarkerEl.title = 'Drag to adjust center point';

                const centerMarker = new mapboxgl.Marker({
                    element: centerMarkerEl,
                    draggable: true
                })
                    .setLngLat([centerLng, centerLat])
                    .addTo(map);

                distanceCenterRef.current = centerMarker;

                // Update circle when marker is dragged
                centerMarker.on('drag', () => {
                    const lngLat = centerMarker.getLngLat();
                    const newCircleGeoJSON = generateCircleGeoJSON(lngLat.lng, lngLat.lat, distanceKm);

                    if (map.getSource('distance-circle')) {
                        map.getSource('distance-circle').setData(newCircleGeoJSON);
                    }
                });

                // Call onChange when drag ends
                centerMarker.on('dragend', () => {
                    const lngLat = centerMarker.getLngLat();
                    if (onChange) {
                        onChange({
                            panCenterLat: parseFloat(lngLat.lat.toFixed(6)),
                            panCenterLng: parseFloat(lngLat.lng.toFixed(6))
                        });
                    }
                });
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

        // Track zoom changes in zoom mode
        if (mode === 'zoom') {
            const updateZoom = () => {
                const zoom = parseFloat(map.getZoom().toFixed(2));
                setCurrentZoom(zoom);
                // Call onChange to pass zoom to parent
                if (onChange) {
                    onChange({ zoom: zoom });
                }
            };

            map.on('zoom', updateZoom);

            // Initial zoom state
            updateZoom();
        }

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, [mode, mapStyle, enforceLimits]);

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
        console.log('📷 handleSetCamera called:', { mode, currentCamera, hasOnChange: !!onChange });
        if (mode === 'camera' && currentCamera && onChange) {
            console.log('📷 Calling onChange with camera:', currentCamera);
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
                <div className="space-y-3">
                    <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
                        {/* Position Info */}
                        <div className="grid grid-cols-3 gap-3 text-sm">
                            <div className="text-center p-2 bg-gray-50 rounded-lg">
                                <span className="text-gray-500 text-xs block uppercase tracking-wide">Latitude</span>
                                <div className="font-mono text-gray-900 font-semibold">{currentCamera.lat}°</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded-lg">
                                <span className="text-gray-500 text-xs block uppercase tracking-wide">Longitude</span>
                                <div className="font-mono text-gray-900 font-semibold">{currentCamera.lng}°</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded-lg">
                                <span className="text-gray-500 text-xs block uppercase tracking-wide">Zoom</span>
                                <div className="font-mono text-gray-900 font-semibold">{currentCamera.zoom}</div>
                            </div>
                        </div>

                        {/* Pitch Slider */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-gray-700 font-medium text-sm">Pitch (Tilt)</label>
                                <span className="font-mono text-gray-900 font-medium text-sm bg-gray-100 px-2 py-0.5 rounded">{currentCamera.pitch}°</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="85"
                                step="1"
                                value={currentCamera.pitch}
                                onChange={(e) => {
                                    const newPitch = parseFloat(e.target.value);
                                    setCurrentCamera(prev => ({ ...prev, pitch: newPitch }));
                                    mapRef.current?.setPitch(newPitch);
                                }}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                <span>0° (Flat)</span>
                                <span>85° (Tilted)</span>
                            </div>
                        </div>

                        {/* Bearing Slider */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-gray-700 font-medium text-sm">Bearing (Rotation)</label>
                                <span className="font-mono text-gray-900 font-medium text-sm bg-gray-100 px-2 py-0.5 rounded">{currentCamera.bearing}°</span>
                            </div>
                            <input
                                type="range"
                                min="-180"
                                max="180"
                                step="1"
                                value={currentCamera.bearing}
                                onChange={(e) => {
                                    const newBearing = parseFloat(e.target.value);
                                    setCurrentCamera(prev => ({ ...prev, bearing: newBearing }));
                                    mapRef.current?.setBearing(newBearing);
                                }}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                <span>-180°</span>
                                <span>0° (North)</span>
                                <span>180°</span>
                            </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="border-t border-gray-100 pt-3">
                            <label className="text-gray-600 text-xs block mb-2 uppercase tracking-wide">Presets</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCurrentCamera(prev => ({ ...prev, pitch: 0, bearing: 0 }));
                                        mapRef.current?.setPitch(0);
                                        mapRef.current?.setBearing(0);
                                    }}
                                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    2D Flat
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCurrentCamera(prev => ({ ...prev, pitch: 60, bearing: -20 }));
                                        mapRef.current?.setPitch(60);
                                        mapRef.current?.setBearing(-20);
                                    }}
                                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    3D City
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCurrentCamera(prev => ({ ...prev, pitch: 70, bearing: 45 }));
                                        mapRef.current?.setPitch(70);
                                        mapRef.current?.setBearing(45);
                                    }}
                                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    Cinematic
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleSetCamera}
                        className="w-full px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-all"
                    >
                        Apply Camera Position
                    </button>
                </div>
            )}

            {mode === 'bounds' && (
                <div className="space-y-3">
                    {/* Use Current View Button */}
                    <button
                        type="button"
                        onClick={handleUseCurrentView}
                        className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-all"
                    >
                        Use Current View as Bounds
                    </button>

                    <p className="text-center text-xs text-gray-500">
                        Zoom/pan to desired area, then click button above
                    </p>
                    {/* Instructions */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                        {isReady === 'click-second' ? (
                            <div className="text-gray-700 font-medium text-center">
                                Click the opposite corner to complete
                            </div>
                        ) : (
                            <div className="text-gray-600 text-xs">
                                <span className="font-medium">Or:</span> Click first corner → Click opposite corner
                            </div>
                        )}
                    </div>

                    {/* Current bounds display */}
                    {value?.southWest && value?.northEast && (
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm font-mono">
                            <div className="text-gray-700 font-medium mb-2 text-xs uppercase tracking-wide">Bounds Set</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-gray-500">SW:</span>
                                    <div className="text-gray-900">{value.southWest[1].toFixed(4)}, {value.southWest[0].toFixed(4)}</div>
                                </div>
                                <div>
                                    <span className="text-gray-500">NE:</span>
                                    <div className="text-gray-900">{value.northEast[1].toFixed(4)}, {value.northEast[0].toFixed(4)}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Clear bounds button */}
                    <button
                        type="button"
                        onClick={handleClearBounds}
                        className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors"
                    >
                        Clear Bounds
                    </button>
                </div>
            )}

            {/* Limit Testing Toggle for Zoom Mode */}
            {mode === 'zoom' && (
                <div className="flex items-center justify-center pt-2">
                    <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-100 transition-colors">
                        <input
                            type="checkbox"
                            checked={enforceLimits}
                            onChange={(e) => setEnforceLimits(e.target.checked)}
                            className="w-3.5 h-3.5 text-gray-900 rounded border-gray-300 focus:ring-gray-900"
                        />
                        <span className="text-xs font-medium text-gray-700">Test Limits (Effect)</span>
                    </label>
                </div>
            )}
        </div>
    );
}
