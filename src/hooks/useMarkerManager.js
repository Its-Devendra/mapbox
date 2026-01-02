"use client";

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';

/**
 * useMarkerManager Hook
 * 
 * Manages all marker-related operations for the map:
 * - Landmark markers (symbol layer with custom icons)
 * - Nearby places (icon layer with hover popups)
 * - Client building marker (with pulse animation)
 * 
 * Extracted from MapContainer.jsx to reduce component complexity.
 */
export function useMarkerManager({
    mapRef,
    isMapLoaded,
    landmarks = [],
    nearbyPlaces = [],
    clientBuilding = null,
    selectedLandmark,
    setSelectedLandmark,
    setShowLandmarkCard,
    getDirections,
    theme = {},
    loadCustomIcons,
    SOURCE_IDS,
    LAYER_IDS,
    MAPBOX_CONFIG,
    activeFilter,
    isRouteAnimationComplete = true,
}) {
    const markersRef = useRef([]);
    const popupsRef = useRef([]);
    const eventHandlersRef = useRef([]);
    const nearbyPlacePopupRef = useRef(null);
    const pulseAnimationFrameRef = useRef(null);

    /**
     * Clean up all markers and event handlers
     */
    const cleanupMarkers = useCallback(() => {
        // Remove popups
        popupsRef.current.forEach(popup => popup.remove());
        popupsRef.current = [];

        // Remove HTML markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Remove event handlers
        if (mapRef?.current) {
            eventHandlersRef.current.forEach(({ event, layer, handler }) => {
                try {
                    if (layer) {
                        mapRef.current.off(event, layer, handler);
                    } else {
                        mapRef.current.off(event, handler);
                    }
                } catch (e) {
                    // Ignore cleanup errors
                }
            });
        }
        eventHandlersRef.current = [];

        // Cancel pulse animation
        if (pulseAnimationFrameRef.current) {
            cancelAnimationFrame(pulseAnimationFrameRef.current);
            pulseAnimationFrameRef.current = null;
        }
    }, [mapRef]);

    /**
     * Create landmarks GeoJSON
     */
    const createLandmarksGeoJSON = useCallback(() => {
        return {
            type: 'FeatureCollection',
            features: landmarks.map(landmark => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: landmark.coordinates || [landmark.longitude, landmark.latitude]
                },
                properties: {
                    id: landmark.id,
                    title: landmark.title,
                    description: landmark.description,
                    hasIcon: !!landmark.icon,
                    isSelected: selectedLandmark?.id === landmark.id
                }
            }))
        };
    }, [landmarks, selectedLandmark]);

    /**
     * Create nearby places GeoJSON
     */
    const createNearbyGeoJSON = useCallback(() => {
        const filteredPlaces = activeFilter === 'all'
            ? nearbyPlaces
            : nearbyPlaces.filter(p => p.categoryName?.toLowerCase() === activeFilter?.toLowerCase());

        return {
            type: 'FeatureCollection',
            features: filteredPlaces.map(place => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: place.coordinates
                },
                properties: {
                    id: place.id,
                    title: place.title,
                    categoryName: place.categoryName || '',
                    hasIcon: !!(place.icon || place.categoryIcon)
                }
            }))
        };
    }, [nearbyPlaces, activeFilter]);

    /**
     * Update landmark markers on the map
     */
    const updateLandmarkMarkers = useCallback(async () => {
        if (!mapRef?.current || !isMapLoaded) return;

        const map = mapRef.current;
        if (!map.isStyleLoaded()) return;

        await loadCustomIcons?.();

        const landmarksGeoJSON = createLandmarksGeoJSON();
        const landmarkSource = map.getSource(SOURCE_IDS.LANDMARKS);

        if (landmarkSource) {
            landmarkSource.setData(landmarksGeoJSON);
        } else if (landmarks.length > 0) {
            map.addSource(SOURCE_IDS.LANDMARKS, {
                type: 'geojson',
                data: landmarksGeoJSON
            });

            map.addLayer({
                id: LAYER_IDS.LANDMARKS,
                type: 'symbol',
                source: SOURCE_IDS.LANDMARKS,
                layout: {
                    'icon-image': [
                        'case',
                        ['get', 'hasIcon'],
                        ['concat', 'landmark-icon-', ['get', 'id']],
                        ''
                    ],
                    'icon-size': MAPBOX_CONFIG?.DEFAULT_MARKER_SIZE || 0.5,
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                    'icon-anchor': 'bottom'
                },
                paint: {
                    'icon-opacity': 1
                },
                filter: ['get', 'hasIcon']
            });

            // Event handlers
            const landmarkClickHandler = (e) => {
                const feature = e.features[0];
                const landmarkId = feature.properties.id;
                const landmark = landmarks.find(l => l.id === landmarkId);

                if (landmark) {
                    e.originalEvent?.preventDefault();
                    setSelectedLandmark(landmark);
                    setShowLandmarkCard(true);
                    if (clientBuilding) {
                        getDirections?.(landmark);
                    }
                }
            };

            const landmarkEnterHandler = () => {
                map.getCanvas().style.cursor = 'pointer';
            };

            const landmarkLeaveHandler = () => {
                map.getCanvas().style.cursor = '';
            };

            map.on('click', LAYER_IDS.LANDMARKS, landmarkClickHandler);
            map.on('mouseenter', LAYER_IDS.LANDMARKS, landmarkEnterHandler);
            map.on('mouseleave', LAYER_IDS.LANDMARKS, landmarkLeaveHandler);

            eventHandlersRef.current.push(
                { event: 'click', layer: LAYER_IDS.LANDMARKS, handler: landmarkClickHandler },
                { event: 'mouseenter', layer: LAYER_IDS.LANDMARKS, handler: landmarkEnterHandler },
                { event: 'mouseleave', layer: LAYER_IDS.LANDMARKS, handler: landmarkLeaveHandler }
            );
        }
    }, [
        mapRef, isMapLoaded, landmarks, clientBuilding, selectedLandmark,
        setSelectedLandmark, setShowLandmarkCard, getDirections, loadCustomIcons,
        createLandmarksGeoJSON, SOURCE_IDS, LAYER_IDS, MAPBOX_CONFIG
    ]);

    /**
     * Update nearby place markers on the map
     */
    const updateNearbyMarkers = useCallback(() => {
        if (!mapRef?.current || !isMapLoaded) return;

        const map = mapRef.current;
        if (!map.isStyleLoaded()) return;

        // Don't show nearby places until route animation is complete
        const nearbyGeoJSON = isRouteAnimationComplete
            ? createNearbyGeoJSON()
            : { type: 'FeatureCollection', features: [] };

        const nearbySource = map.getSource(SOURCE_IDS.NEARBY_PLACES);

        if (nearbySource) {
            nearbySource.setData(nearbyGeoJSON);
        } else {
            map.addSource(SOURCE_IDS.NEARBY_PLACES, {
                type: 'geojson',
                data: nearbyGeoJSON
            });

            // Add nearby places layer
            map.addLayer({
                id: LAYER_IDS.NEARBY_PLACES,
                type: 'symbol',
                source: SOURCE_IDS.NEARBY_PLACES,
                layout: {
                    'icon-image': ['concat', 'nearby-icon-', ['get', 'id']],
                    'icon-size': 0.4,
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true
                },
                filter: ['get', 'hasIcon']
            });

            // Event handlers for hover popup
            const nearbyEnterHandler = (e) => {
                map.getCanvas().style.cursor = 'pointer';
                const feature = e.features[0];
                if (feature) {
                    showNearbyPopup(feature);
                }
            };

            const nearbyLeaveHandler = () => {
                map.getCanvas().style.cursor = '';
                hideNearbyPopup();
            };

            map.on('mouseenter', LAYER_IDS.NEARBY_PLACES, nearbyEnterHandler);
            map.on('mouseleave', LAYER_IDS.NEARBY_PLACES, nearbyLeaveHandler);

            eventHandlersRef.current.push(
                { event: 'mouseenter', layer: LAYER_IDS.NEARBY_PLACES, handler: nearbyEnterHandler },
                { event: 'mouseleave', layer: LAYER_IDS.NEARBY_PLACES, handler: nearbyLeaveHandler }
            );
        }
    }, [mapRef, isMapLoaded, isRouteAnimationComplete, createNearbyGeoJSON, SOURCE_IDS, LAYER_IDS]);

    /**
     * Show popup for nearby place on hover
     */
    const showNearbyPopup = useCallback((feature) => {
        if (!mapRef?.current) return;

        hideNearbyPopup();

        const coordinates = feature.geometry.coordinates.slice();
        const title = feature.properties.title || 'Unknown';
        const category = feature.properties.categoryName || '';

        nearbyPlacePopupRef.current = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: 'nearby-popup',
            offset: 15
        })
            .setLngLat(coordinates)
            .setHTML(`<div class="font-medium">${title}</div>${category ? `<div class="text-xs opacity-75">${category}</div>` : ''}`)
            .addTo(mapRef.current);
    }, [mapRef]);

    /**
     * Hide nearby place popup
     */
    const hideNearbyPopup = useCallback(() => {
        if (nearbyPlacePopupRef.current) {
            nearbyPlacePopupRef.current.remove();
            nearbyPlacePopupRef.current = null;
        }
    }, []);

    /**
     * Main update function - updates all markers
     */
    const updateMarkers = useCallback(async () => {
        await updateLandmarkMarkers();
        updateNearbyMarkers();
    }, [updateLandmarkMarkers, updateNearbyMarkers]);

    // Effect: Update markers when dependencies change
    useEffect(() => {
        if (isMapLoaded) {
            updateMarkers();
        }
    }, [isMapLoaded, landmarks, nearbyPlaces, activeFilter, selectedLandmark, isRouteAnimationComplete]);

    // Effect: Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanupMarkers();
        };
    }, [cleanupMarkers]);

    return {
        markersRef,
        popupsRef,
        updateMarkers,
        cleanupMarkers,
        hideNearbyPopup
    };
}

export default useMarkerManager;
