/**
 * CinematicCameraEngine - Premium Camera Orchestration System
 * 
 * Film-grade camera movements for luxury real estate map experiences.
 * Features drone-style physics, multiple shot types, and camera breathing.
 * 
 * @module CinematicCameraEngine
 */

import { EasingLibrary } from './EasingLibrary';
import { CameraPath } from './CameraPath';

// ═══════════════════════════════════════════════════════════════════════════
// SHOT TYPE ENUMS
// ═══════════════════════════════════════════════════════════════════════════

export const ShotType = {
    ESTABLISHING: 'establishing',
    JOURNEY: 'journey',
    REVEAL: 'reveal',
    LANDMARK_HIGHLIGHT: 'landmark_highlight',
    CONTEXTUAL_ORBIT: 'contextual_orbit',
    CUSTOM: 'custom'
};

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG = {
    // Establishing Shot
    establishing: {
        startZoom: 10,
        endZoom: 14,
        startPitch: 25,
        endPitch: 50,
        orbitAngle: 45,
        duration: 7000
    },

    // Journey Shot
    journey: {
        zoom: 16.5,
        pitch: 58,
        cameraOffset: 0.0003,
        maxBanking: 3,
        baseSpeed: 1,
        curveSpeedFactor: 0.7,
        routeDrawAhead: 0.15
    },

    // Reveal Shot
    reveal: {
        approachDuration: 3500,
        settleDuration: 2500,
        orbitAngle: 30,
        startPitch: 65,
        endPitch: 52,
        zoom: 17
    },

    // Landmark Highlight
    landmarkHighlight: {
        duration: 2200,
        pitch: 55,
        zoom: 17.5,
        lateralOffset: 0.0002
    },

    // Contextual Orbit
    orbit: {
        radius: 0.003,
        radiusGrowth: 1.15,
        angularSpeed: 6,
        pitch: 55,
        duration: 10000
    },

    // Camera Breathing
    breathing: {
        enabled: true,
        pitchAmplitude: 0.5,
        bearingAmplitude: 0.3,
        zoomAmplitude: 0.001,
        frequency: 0.3
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// CINEMATIC CAMERA ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class CinematicCameraEngine {
    constructor(map) {
        this.map = map;
        this.isAnimating = false;
        this.isPaused = false;
        this.currentShot = null;

        // Animation control
        this.animationFrame = null;
        this.cancelRequested = false;

        // Camera state
        this.cameraState = {
            center: [0, 0],
            zoom: 14,
            pitch: 0,
            bearing: 0
        };

        // Velocity for physics
        this.velocity = {
            center: [0, 0],
            zoom: 0,
            pitch: 0,
            bearing: 0
        };

        // Breathing state
        this.breathingTime = 0;
        this.breathingEnabled = true;

        // Callbacks
        this.onProgress = null;
        this.onComplete = null;
        this.onShotChange = null;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CORE ANIMATION LOOP
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Starts the animation loop
     * @private
     */
    _startAnimationLoop(updateFn, duration, easing = EasingLibrary.cinematicEaseInOut) {
        return new Promise((resolve) => {
            this.cancelRequested = false;
            this.isAnimating = true;

            const startTime = performance.now();
            let lastFrameTime = startTime;

            const animate = (currentTime) => {
                // Check for cancellation
                if (this.cancelRequested || !this.map) {
                    this.isAnimating = false;
                    resolve({ cancelled: true });
                    return;
                }

                // Handle pause
                if (this.isPaused) {
                    this.animationFrame = requestAnimationFrame(animate);
                    return;
                }

                const elapsed = currentTime - startTime;
                const deltaTime = (currentTime - lastFrameTime) / 1000; // seconds
                lastFrameTime = currentTime;

                const rawProgress = Math.min(elapsed / duration, 1);
                const easedProgress = easing(rawProgress);

                // Update camera
                const continueAnimation = updateFn(easedProgress, rawProgress, deltaTime);

                // Apply breathing if enabled and shot supports it
                if (this.breathingEnabled && rawProgress > 0.8) {
                    this._applyBreathing(deltaTime);
                }

                // Progress callback
                if (this.onProgress) {
                    this.onProgress(rawProgress, this.currentShot);
                }

                if (rawProgress < 1 && continueAnimation !== false) {
                    this.animationFrame = requestAnimationFrame(animate);
                } else {
                    this.isAnimating = false;
                    resolve({ cancelled: false });
                }
            };

            this.animationFrame = requestAnimationFrame(animate);
        });
    }

    /**
     * Applies camera state to map
     * @private
     */
    _applyCamera() {
        if (!this.map) return;

        try {
            this.map.jumpTo({
                center: this.cameraState.center,
                zoom: this.cameraState.zoom,
                pitch: this.cameraState.pitch,
                bearing: this.cameraState.bearing
            });
        } catch (e) {
            console.warn('Failed to apply camera state:', e);
        }
    }

    /**
     * Gets current camera state from map
     * @private
     */
    _syncFromMap() {
        if (!this.map) return;

        try {
            const center = this.map.getCenter();
            this.cameraState = {
                center: [center.lng, center.lat],
                zoom: this.map.getZoom(),
                pitch: this.map.getPitch(),
                bearing: this.map.getBearing()
            };
        } catch (e) {
            console.warn('Failed to sync from map:', e);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SHOT TYPE: ESTABLISHING
    // High-altitude cinematic descent with subtle orbit
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Execute an establishing shot - cinematic descent from high altitude
     * 
     * @param {[number, number]} target - Target center [lng, lat]
     * @param {object} options - Shot configuration
     */
    async establishingShot(target, options = {}) {
        const config = { ...DEFAULT_CONFIG.establishing, ...options };

        this.currentShot = ShotType.ESTABLISHING;
        this._syncFromMap();

        const startState = { ...this.cameraState };

        // Override start position to be high and wide
        startState.zoom = config.startZoom;
        startState.pitch = config.startPitch;
        startState.center = target;

        // Apply initial position
        this.cameraState = startState;
        this._applyCamera();

        // Small delay for visual setup
        await this._wait(300);

        const startBearing = startState.bearing;
        const endBearing = startBearing + config.orbitAngle;

        return this._startAnimationLoop(
            (progress, raw, dt) => {
                // Use drone takeoff easing for natural lift feeling (inverted for descent)
                const descentProgress = EasingLibrary.droneLanding(progress);

                // Zoom descends
                this.cameraState.zoom = EasingLibrary.lerp(
                    config.startZoom,
                    config.endZoom,
                    descentProgress
                );

                // Pitch increases for more dramatic view
                this.cameraState.pitch = EasingLibrary.lerp(
                    config.startPitch,
                    config.endPitch,
                    EasingLibrary.cinematicEaseInOut(progress)
                );

                // Subtle orbit during descent
                this.cameraState.bearing = EasingLibrary.lerpBearing(
                    startBearing,
                    endBearing,
                    EasingLibrary.easeInOutSine(progress)
                );

                this._applyCamera();
                return true;
            },
            config.duration,
            EasingLibrary.cinematicEaseInOut
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SHOT TYPE: JOURNEY
    // Route-following drone camera with banking and progressive drawing
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Execute a journey shot - follow a route like a drone
     * 
     * @param {Array} routeCoordinates - Array of [lng, lat] points
     * @param {object} options - Shot configuration
     * @param {function} onDrawRoute - Callback to draw route progressively
     */
    async journeyShot(routeCoordinates, options = {}, onDrawRoute = null) {
        if (!routeCoordinates || routeCoordinates.length < 2) {
            console.warn('Journey shot requires at least 2 coordinates');
            return { cancelled: true };
        }

        const config = { ...DEFAULT_CONFIG.journey, ...options };

        this.currentShot = ShotType.JOURNEY;
        this._syncFromMap();

        // Simplify path if too dense
        const simplifiedRoute = CameraPath.simplifyPath(routeCoordinates, 0.0001);

        // Create camera path with offset
        const cameraPath = CameraPath.createOffsetPath(
            simplifiedRoute,
            config.cameraOffset,
            'left'
        );

        // Create arc-length table for constant-speed travel
        const arcTable = CameraPath.createArcLengthTable(cameraPath);

        // Calculate total duration based on path length
        const pathLength = CameraPath.getArcLength(cameraPath);
        const baseDuration = Math.max(5000, pathLength * 500000); // Scale by distance
        const duration = options.duration || Math.min(baseDuration, 15000);

        return this._startAnimationLoop(
            (progress, raw, dt) => {
                // Use arc-length parameterization for constant speed
                const t = CameraPath.reparameterize(arcTable, progress);

                // Get position
                const position = CameraPath.evaluateAt(cameraPath, t);

                // Get bearing from path tangent
                let bearing = CameraPath.getBearingAt(cameraPath, t);

                // Calculate banking based on curvature
                const banking = CameraPath.calculateBanking(cameraPath, t, config.maxBanking);

                // Adjust speed based on curvature (slow down on curves)
                const curvature = CameraPath.getCurvatureAt(cameraPath, t);
                const speedFactor = 1 - curvature * config.curveSpeedFactor;

                // Update camera state
                this.cameraState.center = position;
                this.cameraState.zoom = config.zoom;
                this.cameraState.pitch = config.pitch - banking * 0.5; // Slight pitch adjustment on turns
                this.cameraState.bearing = bearing;

                this._applyCamera();

                // Progressive route drawing
                if (onDrawRoute) {
                    const drawProgress = Math.min(progress + config.routeDrawAhead, 1);
                    const drawIndex = Math.floor(drawProgress * routeCoordinates.length);
                    onDrawRoute(routeCoordinates.slice(0, drawIndex + 1));
                }

                return true;
            },
            duration,
            EasingLibrary.orbitCruise
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SHOT TYPE: REVEAL
    // Slow dramatic approach with subtle orbit and settle
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Execute a reveal shot - elegant arrival at destination
     * 
     * @param {[number, number]} destination - Target [lng, lat]
     * @param {object} options - Shot configuration
     */
    async revealShot(destination, options = {}) {
        const config = { ...DEFAULT_CONFIG.reveal, ...options };

        this.currentShot = ShotType.REVEAL;
        this._syncFromMap();

        const startState = { ...this.cameraState };
        const startBearing = startState.bearing;
        const endBearing = startBearing + config.orbitAngle;

        const totalDuration = config.approachDuration + config.settleDuration;
        const approachRatio = config.approachDuration / totalDuration;

        return this._startAnimationLoop(
            (progress, raw, dt) => {
                if (progress < approachRatio) {
                    // Approach phase
                    const approachProgress = progress / approachRatio;
                    const eased = EasingLibrary.dramaticReveal(approachProgress);

                    // Move toward destination
                    this.cameraState.center = [
                        EasingLibrary.lerp(startState.center[0], destination[0], eased),
                        EasingLibrary.lerp(startState.center[1], destination[1], eased)
                    ];

                    // Zoom in
                    this.cameraState.zoom = EasingLibrary.lerp(
                        startState.zoom,
                        config.zoom,
                        eased
                    );

                    // Pitch adjusts
                    this.cameraState.pitch = EasingLibrary.lerp(
                        config.startPitch,
                        config.endPitch,
                        EasingLibrary.easeInOutSine(approachProgress)
                    );

                    // Subtle orbit
                    this.cameraState.bearing = EasingLibrary.lerpBearing(
                        startBearing,
                        endBearing,
                        EasingLibrary.easeInOutSine(approachProgress)
                    );

                } else {
                    // Settle phase - micro-adjustments
                    const settleProgress = (progress - approachRatio) / (1 - approachRatio);
                    const settleEased = EasingLibrary.moveAndSettle(settleProgress, 0.3);

                    // Very subtle continued orbit
                    const finalOrbitAngle = 8;
                    this.cameraState.bearing = EasingLibrary.lerpBearing(
                        endBearing,
                        endBearing + finalOrbitAngle,
                        settleEased
                    );

                    // Micro zoom adjustment
                    this.cameraState.zoom = config.zoom + EasingLibrary.gentlePulse(settleProgress * 2, 0.05);
                }

                this._applyCamera();
                return true;
            },
            totalDuration,
            EasingLibrary.cinematicEaseInOut
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SHOT TYPE: LANDMARK HIGHLIGHT
    // Professional drone cinematography: approach + parallax + orbit
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Execute a landmark highlight shot - professional drone-style cinematography
     * 
     * Sequence:
     * 1. APPROACH - Smooth bezier flight from current position with mid-flight zoom arc
     * 2. PARALLAX - Subtle zoom out at midpoint for depth sensation
     * 3. ORBIT - Cinematic 360° rotation around the landmark
     * 
     * @param {object} landmark - Landmark with coordinates
     * @param {object} options - Shot configuration
     * @param {function} onTravelProgress - Callback with (progress, bearing, phase)
     */
    async landmarkHighlight(landmark, options = {}, onTravelProgress = null) {
        if (!landmark?.coordinates) {
            console.warn('Landmark highlight requires coordinates');
            return { cancelled: true };
        }

        const config = {
            ...DEFAULT_CONFIG.landmarkHighlight,
            // Approach phase
            approachDuration: 3500,    // Time to reach landmark
            curveIntensity: 0.15,      // Bezier curve intensity (0-0.5)
            parallaxZoomOut: 1.2,      // How much to zoom out at midpoint

            // Orbit phase
            orbitDuration: 5000,       // Duration of orbit
            orbitAngle: 180,           // Degrees to orbit (180 = half circle)
            orbitRadius: 0.001,        // Distance from landmark center
            orbitZoom: 17.5,           // Zoom level during orbit
            orbitPitch: 60,            // Pitch during orbit

            ...options
        };

        this.currentShot = ShotType.LANDMARK_HIGHLIGHT;
        this._syncFromMap();

        const startState = { ...this.cameraState };
        const targetCenter = landmark.coordinates;

        // Calculate initial bearing (direction of approach)
        const approachBearing = CameraPath.calculateBearing(
            startState.center,
            targetCenter
        );

        // Calculate distance for HUD
        const distance = CameraPath.calculateDistance(startState.center, targetCenter) * 111139; // to meters

        // ───────────────────────────────────────────────────────────────────
        // PHASE 1: APPROACH with Parallax Arc
        // Professional drone technique: curved path with mid-flight zoom-out
        // ───────────────────────────────────────────────────────────────────

        // Calculate bezier control point for sweeping curve
        const dx = targetCenter[0] - startState.center[0];
        const dy = targetCenter[1] - startState.center[1];
        const controlPoint = [
            (startState.center[0] + targetCenter[0]) / 2 - dy * config.curveIntensity,
            (startState.center[1] + targetCenter[1]) / 2 + dx * config.curveIntensity
        ];

        const approachStartZoom = startState.zoom;
        const approachEndZoom = config.zoom || 17;

        await this._startAnimationLoop(
            (progress, raw, dt) => {
                // Ultra-smooth easing
                const eased = EasingLibrary.cinematicEaseInOut(progress);

                // Quadratic Bezier path for sweeping curve
                const t = eased;
                const invT = 1 - t;
                const position = [
                    invT * invT * startState.center[0] + 2 * invT * t * controlPoint[0] + t * t * targetCenter[0],
                    invT * invT * startState.center[1] + 2 * invT * t * controlPoint[1] + t * t * targetCenter[1]
                ];

                this.cameraState.center = position;

                // Parallax zoom arc: zoom OUT at midpoint, back IN at end
                const parallaxFactor = Math.sin(progress * Math.PI);
                const baseZoom = EasingLibrary.lerp(approachStartZoom, approachEndZoom, eased);
                this.cameraState.zoom = baseZoom - (parallaxFactor * config.parallaxZoomOut);

                // Smooth pitch transition
                this.cameraState.pitch = EasingLibrary.lerp(
                    startState.pitch,
                    config.orbitPitch,
                    EasingLibrary.easeInOutSine(progress)
                );

                // Bearing follows the curve tangent for natural look
                // Calculate tangent at current point
                const tangentX = 2 * (1 - t) * (controlPoint[0] - startState.center[0]) + 2 * t * (targetCenter[0] - controlPoint[0]);
                const tangentY = 2 * (1 - t) * (controlPoint[1] - startState.center[1]) + 2 * t * (targetCenter[1] - controlPoint[1]);
                const tangentBearing = Math.atan2(tangentX, tangentY) * 180 / Math.PI;

                this.cameraState.bearing = EasingLibrary.lerpBearing(
                    startState.bearing,
                    tangentBearing,
                    EasingLibrary.easeInOutSine(progress * 0.8 + 0.2)
                );

                this._applyCamera();

                // Travel progress callback for HUD
                if (onTravelProgress) {
                    onTravelProgress(progress, this.cameraState.bearing, 'approach');
                }

                return true;
            },
            config.approachDuration,
            EasingLibrary.cinematicEaseInOut
        );

        // Check if cancelled
        if (this.cancelRequested) return { cancelled: true };

        // ───────────────────────────────────────────────────────────────────
        // PHASE 2: CINEMATIC ORBIT
        // Camera orbits around landmark like professional drone footage
        // ───────────────────────────────────────────────────────────────────

        // Calculate starting position on orbit circle
        const orbitStartAngle = this.cameraState.bearing * Math.PI / 180;
        const orbitEndAngle = orbitStartAngle + (config.orbitAngle * Math.PI / 180);

        // Smoothly transition to orbit radius
        const orbitApproachDuration = 800;
        const currentBearing = this.cameraState.bearing;

        await this._startAnimationLoop(
            (progress, raw, dt) => {
                const eased = EasingLibrary.easeInOutSine(progress);

                // Smoothly move to orbit position
                const currentAngle = EasingLibrary.lerp(
                    currentBearing * Math.PI / 180,
                    orbitStartAngle,
                    eased
                );

                const orbitPosition = [
                    targetCenter[0] + Math.sin(currentAngle) * config.orbitRadius * eased,
                    targetCenter[1] + Math.cos(currentAngle) * config.orbitRadius * eased
                ];

                this.cameraState.center = orbitPosition;
                this.cameraState.zoom = EasingLibrary.lerp(this.cameraState.zoom, config.orbitZoom, eased);

                // Look at landmark center
                const lookBearing = CameraPath.calculateBearing(orbitPosition, targetCenter);
                this.cameraState.bearing = lookBearing;

                this._applyCamera();

                if (onTravelProgress) {
                    onTravelProgress(1, this.cameraState.bearing, 'settling');
                }

                return true;
            },
            orbitApproachDuration,
            EasingLibrary.easeInOutSine
        );

        if (this.cancelRequested) return { cancelled: true };

        // Main orbit animation
        await this._startAnimationLoop(
            (progress, raw, dt) => {
                // Smooth cruise orbit easing
                const orbitEased = EasingLibrary.orbitCruise(progress);

                // Calculate position on orbit circle
                const currentAngle = EasingLibrary.lerp(orbitStartAngle, orbitEndAngle, orbitEased);

                const orbitPosition = [
                    targetCenter[0] + Math.sin(currentAngle) * config.orbitRadius,
                    targetCenter[1] + Math.cos(currentAngle) * config.orbitRadius
                ];

                this.cameraState.center = orbitPosition;

                // Camera always looks at the landmark center
                const lookBearing = CameraPath.calculateBearing(orbitPosition, targetCenter);
                this.cameraState.bearing = lookBearing;

                // Subtle zoom and pitch breathing for cinematic feel
                this.cameraState.zoom = config.orbitZoom + EasingLibrary.gentlePulse(progress * 3, 0.2);
                this.cameraState.pitch = config.orbitPitch + EasingLibrary.gentlePulse(progress * 2, 3);

                this._applyCamera();

                if (onTravelProgress) {
                    onTravelProgress(1, this.cameraState.bearing, 'orbit');
                }

                return true;
            },
            config.orbitDuration,
            EasingLibrary.orbitCruise
        );

        return { cancelled: false, distance };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SHOT TYPE: CONTEXTUAL ORBIT
    // 360° orbit around point of interest
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Execute a contextual orbit shot - showcase surroundings
     * 
     * @param {[number, number]} center - Orbit center [lng, lat]
     * @param {object} options - Shot configuration
     * @param {function} onLabelReveal - Callback when labels should appear
     */
    async contextualOrbit(center, options = {}, onLabelReveal = null) {
        const config = { ...DEFAULT_CONFIG.orbit, ...options };

        this.currentShot = ShotType.CONTEXTUAL_ORBIT;
        this._syncFromMap();

        const startBearing = this.cameraState.bearing;
        const totalRotation = options.rotation || 360;

        // Create expanding spiral path
        const orbitPath = CameraPath.createSpiralPath(
            center,
            config.radius,
            config.radius * config.radiusGrowth,
            totalRotation / 360,
            72
        );

        const arcTable = CameraPath.createArcLengthTable(orbitPath);

        return this._startAnimationLoop(
            (progress, raw, dt) => {
                const t = CameraPath.reparameterize(arcTable, progress);

                // Get position on orbit
                const position = CameraPath.evaluateAt(orbitPath, t);

                // Calculate bearing to look at center
                const bearingToCenter = CameraPath.calculateBearing(position, center);

                this.cameraState.center = position;
                this.cameraState.bearing = bearingToCenter;
                this.cameraState.pitch = config.pitch;

                // Slight zoom variation for dynamism
                this.cameraState.zoom = options.zoom || 16;
                this.cameraState.zoom += EasingLibrary.gentlePulse(progress * 4, 0.2);

                this._applyCamera();

                // Progressive label reveals
                if (onLabelReveal) {
                    const revealProgress = progress * 360;
                    onLabelReveal(revealProgress);
                }

                return true;
            },
            config.duration,
            EasingLibrary.orbitCruise
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CAMERA BREATHING
    // Subtle idle motion for a "living" map feel
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Applies breathing motion to camera
     * @private
     */
    _applyBreathing(deltaTime) {
        if (!this.breathingEnabled) return;

        this.breathingTime += deltaTime;

        const breathing = EasingLibrary.breathingMotion(this.breathingTime);
        const config = DEFAULT_CONFIG.breathing;

        // Apply subtle offsets
        this.cameraState.pitch += breathing.pitch * config.pitchAmplitude;
        this.cameraState.bearing += breathing.bearing * config.bearingAmplitude;
        this.cameraState.zoom += breathing.zoom * config.zoomAmplitude;
    }

    /**
     * Starts continuous breathing animation
     */
    startBreathing() {
        if (this.isAnimating) return;

        this.breathingEnabled = true;
        this._syncFromMap();

        const baseState = { ...this.cameraState };

        const breathe = () => {
            if (this.cancelRequested || this.isAnimating || !this.breathingEnabled) {
                return;
            }

            this.breathingTime += 0.016; // ~60fps

            const breathing = EasingLibrary.breathingMotion(this.breathingTime);
            const config = DEFAULT_CONFIG.breathing;

            this.cameraState.pitch = baseState.pitch + breathing.pitch * config.pitchAmplitude;
            this.cameraState.bearing = baseState.bearing + breathing.bearing * config.bearingAmplitude;
            this.cameraState.zoom = baseState.zoom + breathing.zoom * config.zoomAmplitude;

            this._applyCamera();

            this.animationFrame = requestAnimationFrame(breathe);
        };

        this.animationFrame = requestAnimationFrame(breathe);
    }

    /**
     * Stops breathing animation
     */
    stopBreathing() {
        this.breathingEnabled = false;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CONTROL METHODS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Stops all animations immediately
     */
    stop() {
        this.cancelRequested = true;
        this.breathingEnabled = false;

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        this.isAnimating = false;
        this.currentShot = null;
    }

    /**
     * Pauses current animation
     */
    pause() {
        this.isPaused = true;
    }

    /**
     * Resumes paused animation
     */
    resume() {
        this.isPaused = false;
    }

    /**
     * Utility wait function
     * @private
     */
    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Sets progress callback
     */
    setOnProgress(callback) {
        this.onProgress = callback;
    }

    /**
     * Sets completion callback
     */
    setOnComplete(callback) {
        this.onComplete = callback;
    }

    /**
     * Cleans up engine resources
     */
    destroy() {
        this.stop();
        this.map = null;
        this.onProgress = null;
        this.onComplete = null;
    }
}

export default CinematicCameraEngine;
