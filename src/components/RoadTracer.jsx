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

            // Add glow layer (The "Aura")
            map.addLayer({
                id: GLOW_LAYER_ID,
                type: 'line',
                source: SOURCE_ID,
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                    'line-color': '#FFA500', // Deep Orange/Gold Glow
                    'line-width': 12,        // Initial width
                    'line-opacity': 0.4,
                    'line-blur': 10          // Soft edges
                }
            });

            // Add trace layer (The "Core")
            map.addLayer({
                id: ANIMATION_LAYER_ID,
                type: 'line',
                source: SOURCE_ID,
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                    'line-color': '#FFFFFF', // Bright White Core for high contrast
                    'line-width': 4,
                    'line-opacity': 1
                }
            });

            layersAddedRef.current = true;
        }

        // Easing function for smoother flow
        const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        console.log(`▶️ RoadTracer: Starting Premium Neon Animation. Total: ${totalTotalLength.toFixed(2)}km`);
        isAnimatingRef.current = true;
        startTimeRef.current = null;

        // ════════════════════════════════════════════════════════════════════════
        // ⚡ PERFORMANCE OPTIMIZATION: PRE-CALCULATE EVERYTHING ⚡
        // Avoid all trigonometry inside the animation loop. 
        // ════════════════════════════════════════════════════════════════════════

        // 1. Map each feature to a cache of distances
        const featureCache = features.map(feature => {
            const coords = feature.geometry.coordinates;
            const dists = [0];
            let total = 0;

            for (let i = 0; i < coords.length - 1; i++) {
                const d = getDistance(coords[i], coords[i + 1]);
                total += d;
                dists.push(total);
            }
            return {
                coords,
                dists, // Cumulative distances [0, d1, d2...]
                totalLength: total
            };
        });

        const animate = (timestamp) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const elapsed = timestamp - startTimeRef.current;

            // SLOWER, SMOOTHER DURATION
            const safeDuration = Math.max(duration, 6000);
            const rawProgress = Math.min(elapsed / safeDuration, 1);

            // Apply Premium Easing
            const progress = easeInOutCubic(rawProgress);

            // Pulse Geometry (Opacity Only - GPU)
            const pulse = (Math.sin(elapsed / 300) + 1) / 2;
            const currentGlowOpacity = 0.3 + (pulse * 0.5);

            if (map.getLayer(GLOW_LAYER_ID)) {
                map.setPaintProperty(GLOW_LAYER_ID, 'line-opacity', currentGlowOpacity);
            }

            // Calculate global distance target
            const targetGlobalDist = totalTotalLength * progress;

            // Build visible features
            let visibleFeatures = [];

            if (animationMode === 'parallel') {
                // PARALLEL: All routes trace simultaneously 0% -> 100%
                for (let i = 0; i < featureCache.length; i++) {
                    const { coords, dists, totalLength } = featureCache[i];
                    const targetDist = totalLength * progress;

                    if (targetDist >= totalLength) {
                        visibleFeatures.push(features[i]);
                    } else {
                        // Interpolate this specific feature
                        let sliceIndex = 0;
                        // Optimization: Start search from expected index (proportional)
                        const guess = Math.floor(dists.length * progress);
                        // Refine with local search
                        for (let j = (guess > 0 ? guess - 1 : 0); j < dists.length; j++) {
                            if (dists[j] >= targetDist) {
                                sliceIndex = j;
                                break;
                            }
                        }

                        if (sliceIndex > 0) {
                            const prevDist = dists[sliceIndex - 1];
                            const nextDist = dists[sliceIndex];
                            const segmentLen = nextDist - prevDist;
                            const remainder = targetDist - prevDist;

                            const p1 = coords[sliceIndex - 1];
                            const p2 = coords[sliceIndex];
                            const t = segmentLen > 0 ? remainder / segmentLen : 0;

                            const newPoint = [
                                p1[0] + (p2[0] - p1[0]) * t,
                                p1[1] + (p2[1] - p1[1]) * t
                            ];

                            const slicedCoords = coords.slice(0, sliceIndex);
                            slicedCoords.push(newPoint);

                            visibleFeatures.push({
                                type: 'Feature',
                                geometry: {
                                    type: 'LineString',
                                    coordinates: slicedCoords
                                }
                            });
                        }
                    }
                }
            } else {
                // SEQUENTIAL: Fill one, then the next
                let currentDistAccumulator = 0;
                for (let i = 0; i < featureCache.length; i++) {
                    const { coords, dists, totalLength } = featureCache[i];

                    if (currentDistAccumulator + totalLength <= targetGlobalDist) {
                        visibleFeatures.push(features[i]);
                        currentDistAccumulator += totalLength;
                    } else {
                        const localTarget = targetGlobalDist - currentDistAccumulator;

                        let sliceIndex = 0;
                        for (let j = 1; j < dists.length; j++) {
                            if (dists[j] >= localTarget) {
                                sliceIndex = j;
                                break;
                            }
                        }

                        if (sliceIndex > 0) {
                            const prevDist = dists[sliceIndex - 1];
                            const nextDist = dists[sliceIndex];
                            const segmentLen = nextDist - prevDist;
                            const remainder = localTarget - prevDist;

                            const p1 = coords[sliceIndex - 1];
                            const p2 = coords[sliceIndex];

                            const t = segmentLen > 0 ? remainder / segmentLen : 0;
                            const newPoint = [
                                p1[0] + (p2[0] - p1[0]) * t,
                                p1[1] + (p2[1] - p1[1]) * t
                            ];

                            const slicedCoords = coords.slice(0, sliceIndex);
                            slicedCoords.push(newPoint);

                            visibleFeatures.push({
                                type: 'Feature',
                                geometry: {
                                    type: 'LineString',
                                    coordinates: slicedCoords
                                }
                            });
                        }
                        break; // Stop after cutting feature
                    }
                }
            }

            const source = map.getSource(SOURCE_ID);
            if (source) {
                source.setData({ type: 'FeatureCollection', features: visibleFeatures });
            }

            if (progress >= 1) {
                if (source) {
                    source.setData({ type: 'FeatureCollection', features });
                }
                hasPlayedRef.current = true;
                isAnimatingRef.current = false;
                console.log('✅ RoadTracer: Premium Smooth Animation Complete');
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

            // Clean up layers and source
            if (mapRef.current) {
                if (mapRef.current.getLayer(ANIMATION_LAYER_ID)) mapRef.current.removeLayer(ANIMATION_LAYER_ID);
                if (mapRef.current.getLayer(GLOW_LAYER_ID)) mapRef.current.removeLayer(GLOW_LAYER_ID);
                if (mapRef.current.getSource(SOURCE_ID)) mapRef.current.removeSource(SOURCE_ID);
            }

            isAnimatingRef.current = false;
            layersAddedRef.current = false;
        };

    }, [isMapLoaded, isActive, animationMode, duration, onAnimationComplete]);

    return null;
}
