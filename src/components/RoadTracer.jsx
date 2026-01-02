"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import turfLength from '@turf/length';
import lineSliceAlong from '@turf/line-slice-along';

/**
 * RoadTracer Component - GeoJSON Version
 * 
 * Loads a static GeoJSON file and animates a "trace" effect.
 * Full control over animation order and timing.
 */
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
                    console.log(`📁 RoadTracer: Loaded ${validFeatures.length} features from GeoJSON`);
                    featuresRef.current = validFeatures;
                    dataLoadedRef.current = true;
                }
            })
            .catch(err => console.error('❌ RoadTracer: Failed to load GeoJSON', err));
    }, [geoJsonPath]);

    // Animation Effect - runs when isActive changes
    useEffect(() => {
        // Guard: Check all preconditions
        if (!mapRef?.current || !isMapLoaded || !dataLoadedRef.current || !featuresRef.current) return;
        if (!isActive) return;
        if (hasPlayedRef.current) return;
        if (isAnimatingRef.current) return;

        const map = mapRef.current;
        const features = featuresRef.current;

        // Setup layers once
        if (!layersAddedRef.current) {
            if (!map.getSource(SOURCE_ID)) {
                map.addSource(SOURCE_ID, {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] }
                });
            }

            // Remove existing layers if they exist (ensures fresh z-order)
            if (map.getLayer(ANIMATION_LAYER_ID)) map.removeLayer(ANIMATION_LAYER_ID);
            if (map.getLayer(GLOW_LAYER_ID)) map.removeLayer(GLOW_LAYER_ID);

            // Add glow layer (below trace)
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

            // Add trace layer (on top of glow)
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

            console.log('🛣️ RoadTracer: Layers added to map');
            layersAddedRef.current = true;
        }

        // Calculate lengths
        const lengths = features.map(f => turfLength(f));
        const totalLength = lengths.reduce((a, b) => a + b, 0);

        console.log(`▶️ RoadTracer: Starting ${animationMode} animation. Total: ${totalLength.toFixed(2)}km`);
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
                    try {
                        return lineSliceAlong(feature, 0, currentLen);
                    } catch { return null; }
                }).filter(Boolean);
            } else {
                // Sequential
                const targetLength = totalLength * progress;
                let accumulated = 0;

                for (let i = 0; i < features.length; i++) {
                    const feature = features[i];
                    const len = lengths[i];

                    if (accumulated + len <= targetLength) {
                        visibleFeatures.push(feature);
                        accumulated += len;
                    } else {
                        const remaining = targetLength - accumulated;
                        if (remaining > 0.001) {
                            try {
                                visibleFeatures.push(lineSliceAlong(feature, 0, remaining));
                            } catch { /* ignore */ }
                        }
                        break;
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
                console.log('✅ RoadTracer: Animation Complete');
                if (onAnimationComplete) onAnimationComplete();
                return;
            }

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        // Start after brief delay
        const timer = setTimeout(() => {
            animationFrameRef.current = requestAnimationFrame(animate);
        }, 500);

        return () => {
            clearTimeout(timer);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };

    }, [isMapLoaded, isActive]); // Minimal dependencies

    return null;
}
