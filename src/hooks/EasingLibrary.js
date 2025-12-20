/**
 * EasingLibrary - Professional Cinematic Easing Functions
 * 
 * Film-quality motion curves for luxury map experiences.
 * Designed for drone-style camera movements with natural physics.
 * 
 * @module EasingLibrary
 */

// ═══════════════════════════════════════════════════════════════════════════
// CORE MATHEMATICAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Clamp value between 0 and 1
 */
function clamp01(t) {
    return Math.max(0, Math.min(1, t));
}

/**
 * Ken Perlin's smootherstep - 6t^5 - 15t^4 + 10t^3
 * Extremely smooth with zero first AND second derivatives at endpoints
 */
function smootherstep(t) {
    t = clamp01(t);
    return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Sine-based ease in/out - very gentle, organic feeling
 */
function easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
}

/**
 * Quadratic ease in/out - simple smooth curve
 */
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Cubic ease in/out - more pronounced acceleration
 */
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Quartic ease in/out
 */
function easeInOutQuart(t) {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

/**
 * Quintic ease in/out - dramatic slow start/end
 */
function easeInOutQuint(t) {
    return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

// ═══════════════════════════════════════════════════════════════════════════
// CINEMATIC COMPOUND CURVES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * cinematicEaseInOut - Signature cinematic motion curve
 * Blends smootherstep, sine, and quad for ultra-smooth motion
 * Perfect for most camera movements
 */
function cinematicEaseInOut(t) {
    const smooth = smootherstep(t);
    const sine = easeInOutSine(t);
    const quad = easeInOutQuad(t);
    return smooth * 0.5 + sine * 0.3 + quad * 0.2;
}

/**
 * dramaticReveal - Extra slow start and end for dramatic moments
 * Use for destination arrivals and important reveals
 */
function dramaticReveal(t) {
    return easeInOutQuint(t);
}

/**
 * droneTakeoff - Mimics real drone takeoff physics
 * Slow initial lift, smooth acceleration, eases into cruise
 */
function droneTakeoff(t) {
    // Custom curve: very slow start, accelerate in middle, settle at end
    if (t < 0.15) {
        // Very slow lift-off (15% of time, 5% of movement)
        return 0.05 * easeInOutQuad(t / 0.15);
    } else if (t < 0.85) {
        // Main ascent (70% of time, 85% of movement)
        const localT = (t - 0.15) / 0.7;
        return 0.05 + 0.85 * easeInOutSine(localT);
    } else {
        // Final settle (15% of time, 10% of movement)
        const localT = (t - 0.85) / 0.15;
        return 0.9 + 0.1 * smootherstep(localT);
    }
}

/**
 * droneLanding - Smooth approach and gentle touchdown
 * Decelerates smoothly, almost hovers before final settle
 */
function droneLanding(t) {
    // Inverse of takeoff - fast start, very slow end
    if (t < 0.2) {
        // Initial approach (20% of time, 40% of movement)
        return 0.4 * easeInOutQuad(t / 0.2);
    } else if (t < 0.7) {
        // Deceleration phase (50% of time, 45% of movement)
        const localT = (t - 0.2) / 0.5;
        return 0.4 + 0.45 * easeInOutSine(localT);
    } else {
        // Final hover and settle (30% of time, 15% of movement)
        const localT = (t - 0.7) / 0.3;
        return 0.85 + 0.15 * smootherstep(localT);
    }
}

/**
 * orbitCruise - Constant speed with smooth start/end
 * Perfect for continuous orbiting movements
 */
function orbitCruise(t) {
    const easeInRegion = 0.15;
    const easeOutRegion = 0.15;

    if (t < easeInRegion) {
        // Ease in
        return easeInOutSine(t / easeInRegion) * easeInRegion;
    } else if (t > 1 - easeOutRegion) {
        // Ease out
        const localT = (t - (1 - easeOutRegion)) / easeOutRegion;
        return (1 - easeOutRegion) + easeInOutSine(localT) * easeOutRegion;
    } else {
        // Linear cruise in middle
        return t;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PHYSICS-BASED EASINGS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * springDamped - Spring motion with damping
 * Creates subtle overshoot and settle effect
 * @param {number} t - Progress (0-1)
 * @param {object} params - Spring parameters
 * @param {number} params.stiffness - How snappy (default: 100)
 * @param {number} params.damping - How quickly it settles (default: 10)
 * @param {number} params.mass - Affects oscillation speed (default: 1)
 */
function springDamped(t, params = {}) {
    const stiffness = params.stiffness ?? 100;
    const damping = params.damping ?? 10;
    const mass = params.mass ?? 1;

    // Simplified spring formula for smooth settle
    const omega = Math.sqrt(stiffness / mass);
    const zeta = damping / (2 * Math.sqrt(stiffness * mass));

    if (zeta < 1) {
        // Underdamped - slight overshoot
        const omegaD = omega * Math.sqrt(1 - zeta * zeta);
        const envelope = Math.exp(-zeta * omega * t * 3);
        return 1 - envelope * Math.cos(omegaD * t * 3);
    } else {
        // Critically damped or overdamped - smooth settle
        return 1 - (1 + omega * t * 3) * Math.exp(-omega * t * 3);
    }
}

/**
 * exponentialDecay - Natural deceleration
 * Perfect for momentum-based camera slowdown
 * @param {number} t - Progress (0-1)
 * @param {number} lambda - Decay rate (default: 5)
 */
function exponentialDecay(t, lambda = 5) {
    return 1 - Math.exp(-lambda * t);
}

/**
 * elasticSettle - Bouncy settle with decreasing amplitude
 * Good for playful UI elements, use sparingly on camera
 */
function elasticSettle(t) {
    const c4 = (2 * Math.PI) / 3;

    if (t === 0) return 0;
    if (t === 1) return 1;

    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOUND TIMING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * holdThenMove - Pause at start, then animate
 * Use for dramatic pauses before reveals
 * @param {number} t - Progress (0-1)
 * @param {number} holdRatio - Portion of time to hold (0-1, default: 0.3)
 */
function holdThenMove(t, holdRatio = 0.3) {
    if (t < holdRatio) {
        return 0;
    }
    const adjustedT = (t - holdRatio) / (1 - holdRatio);
    return cinematicEaseInOut(adjustedT);
}

/**
 * moveAndSettle - Animate to target, then do micro-settle
 * Perfect for "reveal and breathe" moments
 * @param {number} t - Progress (0-1)
 * @param {number} settleRatio - Portion of time for settling (default: 0.2)
 */
function moveAndSettle(t, settleRatio = 0.2) {
    const moveRatio = 1 - settleRatio;

    if (t < moveRatio) {
        // Main movement
        const adjustedT = t / moveRatio;
        return cinematicEaseInOut(adjustedT) * 0.98; // Stop at 98%
    } else {
        // Micro-settle
        const adjustedT = (t - moveRatio) / settleRatio;
        return 0.98 + smootherstep(adjustedT) * 0.02;
    }
}

/**
 * gentlePulse - Subtle in-out-in motion for breathing effect
 * Returns value oscillating around center
 * @param {number} t - Time value (can exceed 1 for continuous)
 * @param {number} amplitude - Size of pulse (default: 0.02)
 * @param {number} frequency - Pulses per unit time (default: 0.5)
 */
function gentlePulse(t, amplitude = 0.02, frequency = 0.5) {
    // Sine wave centered at 0
    return amplitude * Math.sin(t * frequency * Math.PI * 2);
}

/**
 * breathingMotion - Multi-frequency breathing effect
 * More organic than simple sine wave
 * @param {number} t - Time value
 * @returns {object} - { pitch, bearing, zoom } offsets
 */
function breathingMotion(t) {
    // Combine multiple frequencies for organic feel
    const slowBreath = Math.sin(t * 0.3) * 0.5;
    const microTremor = Math.sin(t * 1.7) * 0.1;
    const drift = Math.sin(t * 0.1) * 0.3;

    return {
        pitch: slowBreath + microTremor * 0.5,     // ±0.6° pitch
        bearing: drift + microTremor * 0.3,        // ±0.33° bearing  
        zoom: (slowBreath + drift) * 0.002         // ±0.001 zoom
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERPOLATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Linear interpolation
 */
function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Smooth bearing interpolation (handles 360° wrap)
 */
function lerpBearing(from, to, t) {
    let diff = to - from;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return from + diff * t;
}

/**
 * Cubic bezier interpolation
 * For smooth curves in 1D
 */
function cubicBezier(t, p0, p1, p2, p3) {
    const invT = 1 - t;
    return (
        invT * invT * invT * p0 +
        3 * invT * invT * t * p1 +
        3 * invT * t * t * p2 +
        t * t * t * p3
    );
}

/**
 * Quadratic bezier interpolation
 */
function quadraticBezier(t, p0, p1, p2) {
    const invT = 1 - t;
    return invT * invT * p0 + 2 * invT * t * p1 + t * t * p2;
}

// ═══════════════════════════════════════════════════════════════════════════
// ARC EFFECTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * parabolicArc - Creates parabolic motion (zoom out mid-flight)
 * @param {number} t - Progress (0-1)
 * @param {number} depth - Maximum arc depth (default: 1)
 * @returns {number} - Arc factor (0 at start/end, depth at middle)
 */
function parabolicArc(t, depth = 1) {
    // sin(π*t) creates 0->1->0 arc
    return Math.sin(t * Math.PI) * depth;
}

/**
 * asymmetricArc - Arc with different rise/fall speeds
 * @param {number} t - Progress (0-1)
 * @param {number} peak - Position of peak (0-1, default: 0.4)
 * @param {number} depth - Maximum depth
 */
function asymmetricArc(t, peak = 0.4, depth = 1) {
    if (t < peak) {
        // Rise phase
        return easeInOutSine(t / peak) * depth;
    } else {
        // Fall phase
        return easeInOutSine(1 - (t - peak) / (1 - peak)) * depth;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const EasingLibrary = {
    // Core easings
    smootherstep,
    easeInOutSine,
    easeInOutQuad,
    easeInOutCubic,
    easeInOutQuart,
    easeInOutQuint,

    // Cinematic curves
    cinematicEaseInOut,
    dramaticReveal,
    droneTakeoff,
    droneLanding,
    orbitCruise,

    // Physics-based
    springDamped,
    exponentialDecay,
    elasticSettle,

    // Compound timing
    holdThenMove,
    moveAndSettle,
    gentlePulse,
    breathingMotion,

    // Interpolation
    lerp,
    lerpBearing,
    cubicBezier,
    quadraticBezier,

    // Arc effects
    parabolicArc,
    asymmetricArc,

    // Utility
    clamp01
};

export default EasingLibrary;
