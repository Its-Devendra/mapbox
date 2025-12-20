/**
 * useCinematicTour Hook - PREMIUM CINEMATIC CAMERA EXPERIENCE
 * 
 * Professional-grade camera movements with:
 * - Film-quality easing curves (30+ curve types)
 * - Bezier path interpolation with arc-length parameterization
 * - Physics-based camera breathing
 * - 5 distinct shot types (Establishing, Journey, Reveal, Highlight, Orbit)
 * - Drone-style banking on curves
 * - Progressive route drawing
 * 
 * Uses the CinematicCameraEngine for all animations.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { CinematicCameraEngine, ShotType } from './CinematicCameraEngine';
import { EasingLibrary } from './EasingLibrary';
import { CameraPath } from './CameraPath';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TIMINGS = {
    ESTABLISHING_DURATION: 7000,  // Epic establishing shot
    INTRO_DURATION: 5000,         // Intro approach
    JOURNEY_DURATION: 8000,       // Route following
    REVEAL_DURATION: 6000,        // Destination arrival
    HIGHLIGHT_DURATION: 2200,     // Landmark highlight
    ORBIT_DURATION: 10000,        // Full orbit
    LANDMARK_PAUSE: 2500,         // Pause at landmarks (with breathing)
    OUTRO_DURATION: 6000,         // Return to overview
    INITIAL_DELAY: 800            // Delay before starting
};

// Re-export for backwards compatibility
export { ShotType } from './CinematicCameraEngine';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useCinematicTour() {
    const [isTourActive, setIsTourActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [totalSteps, setTotalSteps] = useState(0);
    const [currentShot, setCurrentShot] = useState(null);

    const engineRef = useRef(null);
    const cancelRef = useRef(false);
    const timeoutsRef = useRef([]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (engineRef.current) {
                engineRef.current.destroy();
            }
        };
    }, []);

    const getEngine = useCallback((map) => {
        if (!engineRef.current && map) {
            engineRef.current = new CinematicCameraEngine(map);

            // Set up progress tracking
            engineRef.current.setOnProgress((progress, shot) => {
                setCurrentShot(shot);
            });
        }
        return engineRef.current;
    }, []);

    const clearAll = useCallback(() => {
        timeoutsRef.current.forEach(id => clearTimeout(id));
        timeoutsRef.current = [];
        if (engineRef.current) {
            engineRef.current.stop();
        }
    }, []);

    const wait = useCallback((duration) => {
        return new Promise((resolve) => {
            const id = setTimeout(resolve, duration);
            timeoutsRef.current.push(id);
        });
    }, []);

    // ═══════════════════════════════════════════════════════════════════════════
    // SHOT TYPE EXECUTORS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Execute establishing shot - cinematic descent from high altitude
     */
    const establishingShot = useCallback(async (map, target, options = {}) => {
        const engine = getEngine(map);
        if (!engine) return;

        console.log('🎬 Executing Establishing Shot');
        return engine.establishingShot(target, {
            duration: TIMINGS.ESTABLISHING_DURATION,
            ...options
        });
    }, [getEngine]);

    /**
     * Execute journey shot - follow route like a drone
     */
    const journeyShot = useCallback(async (map, routeCoords, options = {}, onDrawRoute) => {
        const engine = getEngine(map);
        if (!engine) return;

        console.log('🎬 Executing Journey Shot');
        return engine.journeyShot(routeCoords, {
            duration: TIMINGS.JOURNEY_DURATION,
            ...options
        }, onDrawRoute);
    }, [getEngine]);

    /**
     * Execute reveal shot - dramatic destination arrival
     */
    const revealShot = useCallback(async (map, destination, options = {}) => {
        const engine = getEngine(map);
        if (!engine) return;

        console.log('🎬 Executing Reveal Shot');
        return engine.revealShot(destination, {
            duration: TIMINGS.REVEAL_DURATION,
            ...options
        });
    }, [getEngine]);

    /**
     * Execute landmark highlight - professional drone-style cinematography with HUD support
     */
    const landmarkHighlight = useCallback(async (map, landmark, options = {}, onTravelProgress = null) => {
        const engine = getEngine(map);
        if (!engine) return;

        console.log('🎬 Executing Landmark Highlight:', landmark?.title);
        return engine.landmarkHighlight(landmark, {
            duration: TIMINGS.HIGHLIGHT_DURATION,
            ...options
        }, onTravelProgress);
    }, [getEngine]);

    /**
     * Execute contextual orbit - 360° showcase
     */
    const contextualOrbit = useCallback(async (map, center, options = {}, onLabelReveal) => {
        const engine = getEngine(map);
        if (!engine) return;

        console.log('🎬 Executing Contextual Orbit');
        return engine.contextualOrbit(center, {
            duration: TIMINGS.ORBIT_DURATION,
            ...options
        }, onLabelReveal);
    }, [getEngine]);

    /**
     * Start camera breathing for idle moments
     */
    const startBreathing = useCallback((map) => {
        const engine = getEngine(map);
        if (engine) {
            engine.startBreathing();
        }
    }, [getEngine]);

    /**
     * Stop camera breathing
     */
    const stopBreathing = useCallback(() => {
        if (engineRef.current) {
            engineRef.current.stopBreathing();
        }
    }, []);

    // ═══════════════════════════════════════════════════════════════════════════
    // LEGACY SMOOTH FLY-TO (backwards compatible)
    // Now uses the engine's landmark highlight for quick flights
    // ═══════════════════════════════════════════════════════════════════════════

    const smoothFlyTo = useCallback(async (map, target, duration = 5000) => {
        clearAll();
        cancelRef.current = false;

        if (!map || !target?.center) return;

        const engine = getEngine(map);
        if (!engine) return;

        // Use the engine for cinematic flight
        return engine.landmarkHighlight(
            { coordinates: target.center },
            {
                duration,
                zoom: target.zoom ?? 17,
                pitch: target.pitch ?? 55
            }
        );
    }, [getEngine, clearAll]);

    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN TOUR ORCHESTRATION - PREMIUM CINEMATIC EXPERIENCE
    // ═══════════════════════════════════════════════════════════════════════════

    const startTour = useCallback(async (map, clientBuilding, landmarks, options = {}) => {
        if (!map || !clientBuilding?.coordinates) return;

        const validLandmarks = landmarks?.filter(l => l?.coordinates) || [];
        const total = 2 + validLandmarks.length + 1; // Establishing + Intro + Landmarks + End

        setTotalSteps(total);
        setCurrentStep(0);
        setIsTourActive(true);
        cancelRef.current = false;

        const engine = getEngine(map);
        if (!engine) return;

        try {
            console.log('🎬 Starting Premium Cinematic Tour...', {
                landmarksCount: validLandmarks.length,
                firstLandmark: validLandmarks[0]?.title,
                clientLocation: clientBuilding?.coordinates
            });

            // Initial delay
            await wait(TIMINGS.INITIAL_DELAY);

            // ═══════════════════════════════════════════════════════════════
            // STEP 1: Establishing Shot - Epic descent from high altitude
            // ═══════════════════════════════════════════════════════════════
            if (!options.skipEstablishing) {
                setCurrentStep(1);
                console.log('🎬 Step 1: Establishing Shot');

                await engine.establishingShot(clientBuilding.coordinates, {
                    duration: TIMINGS.ESTABLISHING_DURATION,
                    startZoom: 10,
                    endZoom: 14,
                    orbitAngle: 60
                });

                if (cancelRef.current) return;
                await wait(500);
            }

            // ═══════════════════════════════════════════════════════════════
            // STEP 2: Reveal Shot - Dramatic approach to client building
            // ═══════════════════════════════════════════════════════════════
            setCurrentStep(options.skipEstablishing ? 1 : 2);
            console.log('🎬 Step 2: Reveal Shot - Client Building');

            await engine.revealShot(clientBuilding.coordinates, {
                approachDuration: 3500,
                settleDuration: 2000,
                zoom: 17.5,
                orbitAngle: 40
            });

            if (cancelRef.current) return;

            // Start breathing during pause
            engine.startBreathing();
            await wait(TIMINGS.LANDMARK_PAUSE);
            engine.stopBreathing();

            // ═══════════════════════════════════════════════════════════════
            // STEP 3+: Visit each landmark with highlight shots
            // ═══════════════════════════════════════════════════════════════
            const stepOffset = options.skipEstablishing ? 2 : 3;

            for (let i = 0; i < validLandmarks.length; i++) {
                if (cancelRef.current) return;

                const landmark = validLandmarks[i];
                setCurrentStep(stepOffset + i);

                console.log(`🎬 Step ${stepOffset + i}: Landmark Highlight - ${landmark.title}`);

                // Elegant highlight shot to landmark
                await engine.landmarkHighlight(landmark, {
                    duration: TIMINGS.HIGHLIGHT_DURATION,
                    zoom: 17,
                    pitch: 55
                });

                if (cancelRef.current) return;

                // Breathing pause at landmark
                engine.startBreathing();
                await wait(TIMINGS.LANDMARK_PAUSE);
                engine.stopBreathing();
            }

            // ═══════════════════════════════════════════════════════════════
            // FINAL STEP: Establishing Shot back to overview
            // ═══════════════════════════════════════════════════════════════
            if (cancelRef.current) return;
            setCurrentStep(total);

            console.log('🎬 Final Step: Return to Overview');

            // Use reverse establishing (like an ascent)
            await smoothFlyTo(map, {
                center: clientBuilding.coordinates,
                zoom: 14,
                pitch: 45,
                bearing: 0
            }, TIMINGS.OUTRO_DURATION);

            console.log('🎬 Premium Cinematic Tour Complete!');

            // Start idle breathing
            engine.startBreathing();

        } catch (error) {
            console.error('Tour error:', error);
        } finally {
            setIsTourActive(false);
        }
    }, [getEngine, smoothFlyTo, wait]);

    const stopTour = useCallback(() => {
        console.log('🛑 Stopping tour...');
        cancelRef.current = true;
        clearAll();
        setIsTourActive(false);
    }, [clearAll]);

    return {
        // Tour control
        startTour,
        stopTour,
        isTourActive,
        currentStep,
        totalSteps,
        currentShot,

        // Individual shot executors
        establishingShot,
        journeyShot,
        revealShot,
        landmarkHighlight,
        contextualOrbit,

        // Legacy (backwards compatible)
        smoothFlyTo,

        // Breathing control
        startBreathing,
        stopBreathing,

        // Engine access for advanced usage
        getEngine
    };
}

export default useCinematicTour;
