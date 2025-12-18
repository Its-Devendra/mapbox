/**
 * useCinematicTour Hook - ULTRA-SMOOTH CINEMATIC DRONE TOUR
 * 
 * Professional-grade camera movements with:
 * - Film-quality easing curves
 * - Continuous momentum (no stops/stutters)
 * - Buttery smooth bearing rotation
 * - Parabolic zoom arcs (zoom out mid-flight)
 * - Natural camera breathing
 */

import { useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

// Animation timing (in milliseconds)
const TIMINGS = {
    INTRO_DURATION: 6000,      // Time to approach client building
    FLIGHT_DURATION: 8000,     // Time to fly between landmarks
    LANDMARK_PAUSE: 2500,      // Pause at each landmark
    OUTRO_DURATION: 6000,      // Return to overview
    INITIAL_DELAY: 800         // Delay before starting
};

// Camera parameters for cinematic feel
const CAMERA = {
    // Easing factors for "following" the target value
    BEARING_SMOOTHING: 0.008,
    PITCH_SMOOTHING: 0.015,
    ZOOM_SMOOTHING: 0.012,

    // Cinematic Arc Parameters
    ARC_ZOOM_OUT: 0.8,         // How much to zoom out mid-flight (delta)
    ARC_PITCH_DIP: 5           // How much to dip pitch mid-flight
};

// ═══════════════════════════════════════════════════════════════════════════
// CINEMATIC EASING FUNCTIONS
// These create film-quality motion with proper acceleration/deceleration
// ═══════════════════════════════════════════════════════════════════════════

function smootherstep(t) {
    t = Math.max(0, Math.min(1, t));
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
}

/**
 * Custom cinematic ease - blends multiple curves for ultra-smooth motion
 */
function cinematicEase(t) {
    const smooth = smootherstep(t);
    const sine = easeInOutSine(t);
    const quad = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    return smooth * 0.5 + sine * 0.3 + quad * 0.2;
}

/**
 * Extra-slow start and end (for dramatic reveals)
 */
function dramaticEase(t) {
    return t < 0.5
        ? 16 * t * t * t * t * t
        : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function lerpBearing(from, to, factor) {
    let diff = to - from;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return from + diff * factor;
}

function calculateBearing(from, to) {
    const lng1 = from[0] * Math.PI / 180;
    const lat1 = from[1] * Math.PI / 180;
    const lng2 = to[0] * Math.PI / 180;
    const lat2 = to[1] * Math.PI / 180;
    const dLng = lng2 - lng1;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useCinematicTour() {
    const [isTourActive, setIsTourActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [totalSteps, setTotalSteps] = useState(0);

    const cancelRef = useRef(false);
    const animationFrameRef = useRef(null);
    const timeoutsRef = useRef([]);

    // Persistent camera state for seamless continuity between segments
    const cameraState = useRef({
        bearing: 0,
        pitch: 60,
        zoom: 16
    });

    const clearAll = useCallback(() => {
        timeoutsRef.current.forEach(id => clearTimeout(id));
        timeoutsRef.current = [];
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    }, []);

    const wait = useCallback((duration) => {
        return new Promise((resolve) => {
            const id = setTimeout(resolve, duration);
            timeoutsRef.current.push(id);
        });
    }, []);

    // ═══════════════════════════════════════════════════════════════════════════
    // SMOOTH FLY-TO WITH CINEMATIC ARC
    // ═══════════════════════════════════════════════════════════════════════════

    const smoothFlyTo = useCallback((map, target, duration = 5000) => {
        // Clear any existing animations/timeouts to prevent conflicts
        // This effectively "interrupts" any running tour or previous flight
        clearAll();

        return new Promise((resolve) => {
            // Reset mechanism to ensure forced execution (e.g. on click)
            cancelRef.current = false;

            // Validate inputs
            if (!map || !target?.center) {
                resolve();
                return;
            }

            // Safely get current map state
            let startCenter;
            try {
                const center = map.getCenter();
                if (!center) { resolve(); return; }
                startCenter = center.toArray();
            } catch (e) {
                resolve();
                return;
            }

            const start = {
                center: startCenter,
                zoom: map.getZoom() || 14,
                pitch: map.getPitch() || 0,
                bearing: map.getBearing() || 0
            };

            // Calculate optimal bearing if not provided
            const targetBearing = target.bearing ?? calculateBearing(start.center, target.center);

            // Determine if this is a "flight" (long distance) or "approach"
            // Long flights get a more dramatic arc
            const isFlight = duration > 4000;

            const startTime = performance.now();

            const animate = (currentTime) => {
                // Check if cancelled or map invalid
                if (cancelRef.current || !map || !map.getCenter) {
                    console.log('🛑 Animation loop stopped:', { cancelled: cancelRef.current, mapExists: !!map });
                    resolve();
                    return;
                }

                const elapsed = currentTime - startTime;
                const rawProgress = Math.min(elapsed / duration, 1);

                // Debug log every ~10%
                if (rawProgress % 0.1 < 0.02) {
                    console.log(`✈️ FlyTo Progress: ${rawProgress.toFixed(2)}`, { isFlight, duration });
                }

                // Use cinematic easing
                const progress = isFlight ? cinematicEase(rawProgress) : dramaticEase(rawProgress);

                // ─────────────────────────────────────────────────────────────────
                // PATH: Quadratic Bezier Curve for "Sweeping" motion
                // ─────────────────────────────────────────────────────────────────

                // Calculate control point for curve (offset perpendicular to path)
                // Only calculate this once effectively (or deterministic based on inputs)
                const dx = target.center[0] - start.center[0];
                const dy = target.center[1] - start.center[1];

                // Perpendicular vector (-dy, dx) scaled by curve factor
                // We add a curve based on distance to make it feel organic
                const curveMagnitude = 0.2; // 20% of distance
                const controlPoint = [
                    (start.center[0] + target.center[0]) / 2 - (dy * curveMagnitude),
                    (start.center[1] + target.center[1]) / 2 + (dx * curveMagnitude)
                ];

                // Quadratic Bezier: (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
                const t = progress;
                const invT = 1 - t;

                const center = isFlight ? [
                    (invT * invT * start.center[0]) + (2 * invT * t * controlPoint[0]) + (t * t * target.center[0]),
                    (invT * invT * start.center[1]) + (2 * invT * t * controlPoint[1]) + (t * t * target.center[1])
                ] : [
                    lerp(start.center[0], target.center[0], progress),
                    lerp(start.center[1], target.center[1], progress)
                ];

                // ─────────────────────────────────────────────────────────────────
                // BEARING: Smooth interpolation to target
                // ─────────────────────────────────────────────────────────────────
                let currentBearing = lerpBearing(start.bearing, targetBearing, progress);

                // ─────────────────────────────────────────────────────────────────
                // PITCH & ZOOM: Deeper Parabolic Arc
                // ─────────────────────────────────────────────────────────────────
                // Make it more dramatic
                let currentPitch, currentZoom;

                if (isFlight) {
                    const arcFactor = Math.sin(progress * Math.PI);

                    const basePitch = lerp(start.pitch, target.pitch ?? 55, progress);
                    const baseZoom = lerp(start.zoom, target.zoom ?? 17, progress);

                    // Increased arc depth for "Cinema" feel
                    currentPitch = basePitch - (arcFactor * 15); // Dip pitch 15 degrees
                    currentZoom = baseZoom - (arcFactor * 1.5);  // Zoom out 1.5 levels
                } else {
                    currentPitch = lerp(start.pitch, target.pitch ?? start.pitch, progress);
                    currentZoom = lerp(start.zoom, target.zoom ?? start.zoom, progress);
                }

                try {
                    map.jumpTo({
                        center,
                        zoom: currentZoom,
                        pitch: currentPitch,
                        bearing: currentBearing
                    });
                } catch (e) {
                    resolve();
                    return;
                }

                cameraState.current = { bearing: currentBearing, pitch: currentPitch, zoom: currentZoom };

                if (rawProgress < 1) {
                    animationFrameRef.current = requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };

            animationFrameRef.current = requestAnimationFrame(animate);
        });
    }, []);

    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN TOUR ORCHESTRATION
    // ═══════════════════════════════════════════════════════════════════════════

    const startTour = useCallback(async (map, clientBuilding, landmarks) => {
        if (!map || !clientBuilding?.coordinates) return;

        const validLandmarks = landmarks?.filter(l => l?.coordinates) || [];
        const total = 1 + validLandmarks.length + 1; // Start + Landmarks + End

        setTotalSteps(total);
        setCurrentStep(0);
        setIsTourActive(true);
        cancelRef.current = false;

        // Initialize camera state
        cameraState.current = { bearing: -30, pitch: 55, zoom: 16.5 };

        try {
            console.log('🎬 Starting direct cinematic tour...', {
                landmarksCount: validLandmarks.length,
                firstLandmark: validLandmarks[0]?.title,
                clientLocation: clientBuilding?.coordinates
            });

            // Initial delay
            await wait(TIMINGS.INITIAL_DELAY);

            // ═══════════════════════════════════════════════════════════════
            // STEP 1: Intro - cinematic approach to client building
            // ═══════════════════════════════════════════════════════════════
            setCurrentStep(1);

            await smoothFlyTo(map, {
                center: clientBuilding.coordinates,
                zoom: 17.5,
                pitch: 60,
                bearing: -30
            }, TIMINGS.INTRO_DURATION);

            if (cancelRef.current) return;
            await wait(TIMINGS.LANDMARK_PAUSE);

            // ═══════════════════════════════════════════════════════════════
            // STEP 2+: Visit each landmark individually
            // ═══════════════════════════════════════════════════════════════
            let currentLocation = clientBuilding.coordinates;

            for (let i = 0; i < validLandmarks.length; i++) {
                if (cancelRef.current) return;

                const landmark = validLandmarks[i];
                setCurrentStep(2 + i);

                console.log(`🎬 Flying to: ${landmark.title}`);

                // Calculate bearing to next landmark
                const bearingToLandmark = calculateBearing(currentLocation, landmark.coordinates);

                // Fly directly to landmark with cinematic arc
                await smoothFlyTo(map, {
                    center: landmark.coordinates,
                    zoom: 17,             // Closer zoom for inspection
                    pitch: 55,            // Slight angle
                    bearing: bearingToLandmark // Face the landmark as we arrive
                }, TIMINGS.FLIGHT_DURATION);

                currentLocation = landmark.coordinates;

                if (cancelRef.current) return;
                await wait(TIMINGS.LANDMARK_PAUSE);
            }

            // ═══════════════════════════════════════════════════════════════
            // FINAL STEP: Outro - ascent to overview
            // ═══════════════════════════════════════════════════════════════
            if (cancelRef.current) return;
            setCurrentStep(total);

            console.log('🎬 Ascending to overview...');

            await smoothFlyTo(map, {
                center: clientBuilding.coordinates,
                zoom: 14,
                pitch: 0,
                bearing: 0
            }, TIMINGS.OUTRO_DURATION);

            console.log('🎬 Cinematic tour complete!');

        } catch (error) {
            console.error('Tour error:', error);
        } finally {
            setIsTourActive(false);
            clearAll();
        }
    }, [smoothFlyTo, wait, clearAll]);

    const stopTour = useCallback((map) => {
        console.log('🛑 Stopping tour...');
        cancelRef.current = true;
        clearAll();
        setIsTourActive(false);
    }, [clearAll]);

    return { startTour, stopTour, smoothFlyTo, isTourActive, currentStep, totalSteps };
}

export default useCinematicTour;
