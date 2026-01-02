"use client";

import { useEffect, useRef } from 'react';

/**
 * RoadTracer Component - Custom Math Version (No Turf.js)
 *
 * Loads a static GeoJSON file and animates a "trace" effect.
 * Uses custom geometric calculations to avoid heavy library dependencies.
 */

// --- Geometric Helpers ---

function toRad(x) {
    return x * Math.PI / 180;
}

function toDeg(x) {
    return x * 180 / Math.PI;
}

/**
 * Haversine distance between two [lng, lat] points in kilometers
 */
function getDistance(coord1, coord2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(coord2[1] - coord1[1]);
    const dLng = toRad(coord2[0] - coord1[0]);
    const lat1 = toRad(coord1[1]);
    const lat2 = toRad(coord2[1]);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Calculate total length of a LineString coordinate array in km
 */
function getLineLength(coordinates) {
    let total = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
        total += getDistance(coordinates[i], coordinates[i + 1]);
    }
    return total;
}

/**
 * Interpolate a point on a segment [start, end] at a given distance from start
 */
function getPointAtDistance(start, end, distance, segmentLength) {
    if (segmentLength === 0) return start;
    const ratio = distance / segmentLength;
    const lng = start[0] + (end[0] - start[0]) * ratio;
    const lat = start[1] + (end[1] - start[1]) * ratio;
    return [lng, lat];
}

/**
 * Slice a LineString from the start up to a specific distance in km
 */
function sliceLineString(coordinates, targetLength) {
    if (targetLength <= 0) return [coordinates[0], coordinates[0]];
    // If target is beyond total length (approx), return full
    // But we calculate precisely

    let traveled = 0;
    const result = [coordinates[0]];

    for (let i = 0; i < coordinates.length - 1; i++) {
        const start = coordinates[i];
        const end = coordinates[i + 1];
        const segDist = getDistance(start, end);

        if (traveled + segDist >= targetLength) {
            // The split point is on this segment
            const remaining = targetLength - traveled;
            const finalPoint = getPointAtDistance(start, end, remaining, segDist);
            result.push(finalPoint);
            return result;
        }

        result.push(end);
        traveled += segDist;
    }

    return result;
}

export default function RoadTracer({
    mapRef,
    isMapLoaded,
    isActive = true,
    animationMode = "sequential",
    duration = 4000,
    onAnimationComplete,
    geoJsonPath = "/data/shalimar.geojson"
}) {
    const featuresRef = useRef(null);
    const animationFrameRef = useRef(null);
    const startTimeRef = useRef(null);
    const hasPlayedRef = useRef(false);
    const isAnimatingRef = useRef(false);
    const layersAddedRef = useRef(false);
    const dataLoadedRef = useRef(false);
    const featureLengthsRef = useRef([]); // Store pre-calculated lengths

    const ANIMATION_LAYER_ID = 'ring-road-trace';
    const GLOW_LAYER_ID = 'ring-road-glow';
    const SOURCE_ID = 'animated-route-source';

    // Load GeoJSON once on mount
    useEffect(() => {
        if (dataLoadedRef.current) return;

        fetch(geoJsonPath)
            .then(res => res.json())
            .then(data => {
                if (data.features && data.features.length > 0) {
                    const validFeatures = data.features.filter(f =>
                        f.geometry &&
                        (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString') &&
                        f.geometry.coordinates.length > 1
                    );

                    // Flatten MultiLineStrings or treat complex geometries simplistically
                    // For RoadTracer, we strictly assume LineString for standard animation
                    // If MultiLineString, we take the longest segment or just treat first
                    const simpleFeatures = validFeatures.map(f => {
                        if (f.geometry.type === 'MultiLineString') {
                            // Convert to LineString (take first line) for simplicity or iterate
                            // Let's assume standard LineString for the specific 'shalimar' route
                            return {
                                type: 'Feature',
                                geometry: {
                                    type: 'LineString',
                                    coordinates: f.geometry.coordinates[0]
                                }
                            };
                        }
                        return f;
                    });

                    // Pre-calculate lengths
                    const lengths = simpleFeatures.map(f => getLineLength(f.geometry.coordinates));

                    console.log(`📁 RoadTracer: Loaded ${simpleFeatures.length} features. Total Lengths:`, lengths);

                    featuresRef.current = simpleFeatures;
                    featureLengthsRef.current = lengths;
                    dataLoadedRef.current = true;
                }
            })
            .catch(err => console.error('❌ RoadTracer: Failed to load GeoJSON', err));
    }, [geoJsonPath]);

    // Animation Effect
    useEffect(() => {
        // Guard checks
        if (!mapRef?.current || !isMapLoaded || !dataLoadedRef.current || !featuresRef.current) return;
        if (!isActive) return;
        if (hasPlayedRef.current) return;
        if (isAnimatingRef.current) return;

        const map = mapRef.current;
        const features = featuresRef.current;
        const lengths = featureLengthsRef.current;
        const totalTotalLength = lengths.reduce((a, b) => a + b, 0);

        // Setup layers
        if (!layersAddedRef.current) {
            if (!map.getSource(SOURCE_ID)) {
                map.addSource(SOURCE_ID, {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] }
                });
            }

            // Remove existing layers if present
            if (map.getLayer(ANIMATION_LAYER_ID)) map.removeLayer(ANIMATION_LAYER_ID);
            if (map.getLayer(GLOW_LAYER_ID)) map.removeLayer(GLOW_LAYER_ID);

            // Add glow layer
            map.addLayer({
                id: GLOW_LAYER_ID,
                type: 'line',
                source: SOURCE_ID,
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                    'line-color': '#FFFF00',
                    'line-width': 12,
                    'line-opacity': 0.6,
                    'line-blur': 8
                }
            });

            // Add trace layer
            map.addLayer({
                id: ANIMATION_LAYER_ID,
                type: 'line',
                source: SOURCE_ID,
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                    'line-color': '#FFD700',
                    'line-width': 5,
                    'line-opacity': 1
                }
            });

            layersAddedRef.current = true;
        }

        console.log(`▶️ RoadTracer: Starting Custom Animation. Total: ${totalTotalLength.toFixed(2)}km`);
        isAnimatingRef.current = true;
        startTimeRef.current = null;

        const animate = (timestamp) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const elapsed = timestamp - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);

            let visibleFeatures = [];

            if (animationMode === 'all-at-once' || animationMode === 'parallel') {
                visibleFeatures = features.map((feature, idx) => {
                    const len = lengths[idx];
                    const currentLen = len * progress;
                    if (currentLen < 0.001) return null;

                    const slicedCoords = sliceLineString(feature.geometry.coordinates, currentLen);
                    return {
                        type: 'Feature',
                        geometry: {
                            type: 'LineString',
                            coordinates: slicedCoords
                        }
                    };
                }).filter(Boolean);
            } else {
                // Sequential Logic
                const currentGlobalDist = totalTotalLength * progress;
                let traversed = 0;

                for (let i = 0; i < features.length; i++) {
                    const feature = features[i];
                    const len = lengths[i];

                    if (traversed + len <= currentGlobalDist) {
                        // Fully visible
                        visibleFeatures.push(feature);
                        traversed += len;
                    } else {
                        // Partially visible - this is the active segment
                        const remaining = currentGlobalDist - traversed;
                        if (remaining > 0.001) {
                            const slicedCoords = sliceLineString(feature.geometry.coordinates, remaining);
                            visibleFeatures.push({
                                type: 'Feature',
                                geometry: {
                                    type: 'LineString',
                                    coordinates: slicedCoords
                                }
                            });
                        }
                        break; // Stop after currently drawing segment
                    }
                }
            }

            const source = map.getSource(SOURCE_ID);
            if (source) {
                source.setData({ type: 'FeatureCollection', features: visibleFeatures });
            }

            if (progress >= 1) {
                // Final state - show everything full
                if (source) {
                    source.setData({ type: 'FeatureCollection', features });
                }
                hasPlayedRef.current = true;
                isAnimatingRef.current = false;
                console.log('✅ RoadTracer: Custom Animation Complete');
                if (onAnimationComplete) onAnimationComplete();
                return;
            }

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        // Small start delay
        const timer = setTimeout(() => {
            animationFrameRef.current = requestAnimationFrame(animate);
        }, 500);

        return () => {
            clearTimeout(timer);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };

    }, [isMapLoaded, isActive, animationMode, duration, onAnimationComplete]);

    return null;
}
