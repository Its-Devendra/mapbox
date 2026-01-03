"use client";

import React, { useEffect, useRef, useCallback } from 'react';
import { easeInOutCubic } from '@/utils/mapUtils';

export default function RoadTracer({
    mapRef,
    isMapLoaded,
    isActive,
    onAnimationComplete,
    onProgress, // NEW: Reports progress (0.0 to 1.0) each frame for seamless orchestration
    geojsonRoutes, // GeoJSON FeatureCollection passed from parent
    theme
}) {
    const requestRef = useRef();
    const startTimeRef = useRef();
    const sourceIdRef = useRef('road-tracer-source');
    const layerIdRef = useRef('road-tracer-layer');
    const glowLayerIdRef = useRef('road-tracer-glow');

    // Store processed routes: { coordinates: [], totalDistance: number, distances: [] }
    const routesDataRef = useRef([]);

    // Cleanup map resources
    const cleanup = useCallback(() => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);

        if (mapRef.current && mapRef.current.isStyleLoaded()) {
            if (mapRef.current.getLayer(layerIdRef.current)) mapRef.current.removeLayer(layerIdRef.current);
            if (mapRef.current.getLayer(glowLayerIdRef.current)) mapRef.current.removeLayer(glowLayerIdRef.current);
            if (mapRef.current.getLayer('road-tracer-outer-glow')) mapRef.current.removeLayer('road-tracer-outer-glow');
            if (mapRef.current.getSource(sourceIdRef.current)) mapRef.current.removeSource(sourceIdRef.current);
        }
    }, [mapRef]);

    // Main Logic
    useEffect(() => {
        // Wait for map, activation, and data
        if (!mapRef.current || !isMapLoaded || !isActive || !geojsonRoutes?.features?.length) {
            // If becomes inactive, cleanup
            if (!isActive) cleanup();
            return;
        }

        let isMounted = true;
        console.log('🚀 RoadTracer: Starting GeoJSON route tracing...', { routes: geojsonRoutes.features.length });

        const startTracing = async () => {
            // 1. Process GeoJSON routes directly
            const validRoutes = geojsonRoutes.features.filter(f => f.geometry && f.geometry.type === 'LineString');

            if (validRoutes.length === 0) {
                console.warn('RoadTracer: No valid LineString features found in GeoJSON');
                if (onAnimationComplete) onAnimationComplete();
                return;
            }

            // 2. Pre-process routes for animation
            routesDataRef.current = validRoutes.map((feature) => {
                const coordinates = feature.geometry.coordinates;
                // Precompute distances for interpolation
                const distances = [0];
                let totalDistance = 0;
                for (let i = 1; i < coordinates.length; i++) {
                    const dx = coordinates[i][0] - coordinates[i - 1][0];
                    const dy = coordinates[i][1] - coordinates[i - 1][1];
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    totalDistance += dist;
                    distances.push(totalDistance);
                }
                return { coordinates, totalDistance, distances };
            });

            // 3. Setup Source and Layers
            const map = mapRef.current;
            const sourceId = sourceIdRef.current;

            // Layer IDs for multi-pass glow
            const visibleLayerId = layerIdRef.current; // Core (Top)
            const innerGlowId = glowLayerIdRef.current; // Inner Glow (Middle)
            const outerGlowId = 'road-tracer-outer-glow'; // Outer Glow (Bottom)

            // Color from theme
            // Cinematic Liquid Gold Palette
            const atmosphereColor = '#b45309'; // Deep Sienna (Base)
            const plasmaColor = '#f59e0b'; // Electric Gold (Body)
            const filamentColor = '#fffbeb'; // Champagne (Hot Core)

            // Motion Curve: Swift Out (Quintic) - Fast attack, elegant settle
            const swiftEaseOut = (t) => 1 - Math.pow(1 - t, 5);

            // 1. Atmosphere (Ambient Spill - Grounds the light)
            if (!map.getSource(sourceId)) {
                map.addSource(sourceId, {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] }
                });
            }

            if (!map.getLayer(outerGlowId)) {
                map.addLayer({
                    id: outerGlowId,
                    type: 'line',
                    source: sourceId,
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                        'line-color': atmosphereColor,
                        'line-width': 32, // Massive dispersion
                        'line-opacity': 0.3,
                        'line-blur': 24 // Soft ambient finish
                    }
                });
            }

            // 2. Plasma (The Body - Vibrant Gold)
            if (!map.getLayer(innerGlowId)) {
                map.addLayer({
                    id: innerGlowId,
                    type: 'line',
                    source: sourceId,
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                        'line-color': plasmaColor,
                        'line-width': 8,
                        'line-opacity': 0.8,
                        'line-blur': 6 // Medium blur for plasma look
                    }
                });
            }

            // 3. Filament (The Energy Source - Blurs into plasma)
            if (!map.getLayer(visibleLayerId)) {
                map.addLayer({
                    id: visibleLayerId,
                    type: 'line',
                    source: sourceId,
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                        'line-color': filamentColor,
                        'line-width': 3,
                        'line-opacity': 1.0,
                        'line-blur': 2 // CRITICAL: Melts the core into the gold
                    }
                });
            }

            // 4. Start Animation Loop
            startTimeRef.current = performance.now();
            const duration = 4000; // Increased duration for slower animation
            const fadeDuration = 1000; // 1s fade out
            let isTraceFinished = false;

            const animate = (time) => {
                const elapsed = time - startTimeRef.current;
                const progress = Math.min(elapsed / duration, 1);

                // Report progress for seamless orchestration (icons can start at 80%)
                if (onProgress) onProgress(progress);

                // Tracing phase - only update geometry if not finished
                if (!isTraceFinished) {
                    // Use Swift Out curve (defined above) for Apple-grade motion
                    const easedProgress = swiftEaseOut(progress);

                    const features = routesDataRef.current.map(routeData => {
                        const { coordinates, totalDistance, distances } = routeData;
                        const targetDist = totalDistance * easedProgress;

                        // Get partial coordinates
                        const currentCoords = [];
                        if (targetDist <= 0) {
                            currentCoords.push(coordinates[0]);
                        } else if (targetDist >= totalDistance) {
                            currentCoords.push(...coordinates);
                        } else {
                            for (let i = 0; i < distances.length; i++) {
                                if (distances[i] <= targetDist) {
                                    currentCoords.push(coordinates[i]);
                                } else {
                                    // Interpolate last point
                                    const segmentStart = distances[i - 1];
                                    const segmentLen = distances[i] - segmentStart;
                                    const t = (targetDist - segmentStart) / segmentLen;
                                    const p1 = coordinates[i - 1];
                                    const p2 = coordinates[i];
                                    const newPt = [
                                        p1[0] + t * (p2[0] - p1[0]),
                                        p1[1] + t * (p2[1] - p1[1])
                                    ];
                                    currentCoords.push(newPt);
                                    break;
                                }
                            }
                        }

                        return {
                            type: 'Feature',
                            geometry: {
                                type: 'LineString',
                                coordinates: currentCoords.length > 1 ? currentCoords : [coordinates[0], coordinates[0]]
                            }
                        };
                    });

                    // Update Data
                    if (map.getSource(sourceId)) {
                        map.getSource(sourceId).setData({
                            type: 'FeatureCollection',
                            features: features
                        });
                    }

                    if (progress >= 1) {
                        isTraceFinished = true;
                    }
                }

                // Completion and Fade out
                if (progress >= 1) {
                    const fadeElapsed = elapsed - duration;
                    const fadeProgress = Math.min(fadeElapsed / fadeDuration, 1);
                    const opacity = 1 - fadeProgress;

                    // Apply fade to layers
                    // Apply fade to layers
                    requestAnimationFrame(() => {
                        if (map.getLayer(visibleLayerId)) {
                            map.setPaintProperty(visibleLayerId, 'line-opacity', 1.0 * opacity);
                        }
                        if (map.getLayer(innerGlowId)) {
                            map.setPaintProperty(innerGlowId, 'line-opacity', 0.8 * opacity);
                        }
                        if (map.getLayer(outerGlowId)) {
                            map.setPaintProperty(outerGlowId, 'line-opacity', 0.4 * opacity);
                        }
                    });

                    if (fadeProgress < 1) {
                        requestRef.current = requestAnimationFrame(animate);
                    } else {
                        console.log('🏁 RoadTracer: Animation and fade out complete');
                        // Clean up source data to ensure it's gone
                        if (map.getSource(sourceId)) {
                            map.getSource(sourceId).setData({
                                type: 'FeatureCollection',
                                features: []
                            });
                        }
                        if (onAnimationComplete) onAnimationComplete();
                    }
                } else {
                    requestRef.current = requestAnimationFrame(animate);
                }
            };

            requestRef.current = requestAnimationFrame(animate);
        };

        startTracing();

        return () => {
            isMounted = false;
            cleanup();
        };
    }, [mapRef, isMapLoaded, isActive, geojsonRoutes, theme, cleanup, onAnimationComplete, onProgress]);

    return null; // Logic only component
}
