/**
 * CameraPath - Bezier Spline Path System for Cinematic Camera Motion
 * 
 * Provides smooth path interpolation using cubic bezier curves.
 * Supports arc-length parameterization for consistent-speed travel.
 * 
 * @module CameraPath
 */

import { EasingLibrary } from './EasingLibrary';

const { lerp, lerpBearing, cubicBezier, quadraticBezier, clamp01 } = EasingLibrary;

// ═══════════════════════════════════════════════════════════════════════════
// PATH CREATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a smooth cubic bezier path from control points
 * Uses Catmull-Rom to cubic bezier conversion for smooth curves through points
 * 
 * @param {Array<[number, number]>} points - Array of [lng, lat] points
 * @param {number} tension - Curve tension (0-1, default: 0.5)
 * @returns {Array} - Array of bezier segments
 */
function createBezierPath(points, tension = 0.5) {
    if (!points || points.length < 2) {
        return [];
    }

    if (points.length === 2) {
        // Simple line - create trivial bezier
        const [p0, p1] = points;
        return [{
            p0: p0,
            p1: [lerp(p0[0], p1[0], 0.33), lerp(p0[1], p1[1], 0.33)],
            p2: [lerp(p0[0], p1[0], 0.66), lerp(p0[1], p1[1], 0.66)],
            p3: p1
        }];
    }

    const segments = [];

    // For each segment, calculate control points using Catmull-Rom
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];

        // Catmull-Rom to Bezier conversion
        const cp1 = [
            p1[0] + (p2[0] - p0[0]) * tension / 6,
            p1[1] + (p2[1] - p0[1]) * tension / 6
        ];

        const cp2 = [
            p2[0] - (p3[0] - p1[0]) * tension / 6,
            p2[1] - (p3[1] - p1[1]) * tension / 6
        ];

        segments.push({
            p0: p1,
            p1: cp1,
            p2: cp2,
            p3: p2
        });
    }

    return segments;
}

/**
 * Creates a smooth path with automatic lateral offset
 * For drone shots that don't fly directly over the route
 * 
 * @param {Array} points - Original path points
 * @param {number} offsetDistance - Lateral offset (in degrees)
 * @param {string} side - 'left' or 'right'
 */
function createOffsetPath(points, offsetDistance = 0.0003, side = 'left') {
    if (points.length < 2) return points;

    const offsetPoints = [];
    const sideMultiplier = side === 'left' ? 1 : -1;

    for (let i = 0; i < points.length; i++) {
        const prev = points[Math.max(0, i - 1)];
        const curr = points[i];
        const next = points[Math.min(points.length - 1, i + 1)];

        // Calculate direction vector
        const dx = next[0] - prev[0];
        const dy = next[1] - prev[1];
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) {
            offsetPoints.push(curr);
            continue;
        }

        // Perpendicular normal
        const nx = -dy / length * sideMultiplier;
        const ny = dx / length * sideMultiplier;

        offsetPoints.push([
            curr[0] + nx * offsetDistance,
            curr[1] + ny * offsetDistance
        ]);
    }

    return createBezierPath(offsetPoints);
}

// ═══════════════════════════════════════════════════════════════════════════
// PATH EVALUATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluates position on a bezier path at parameter t
 * 
 * @param {Array} path - Array of bezier segments
 * @param {number} t - Parameter (0-1)
 * @returns {[number, number]} - [lng, lat] position
 */
function evaluateAt(path, t) {
    if (!path || path.length === 0) return [0, 0];

    t = clamp01(t);

    // Find which segment we're in
    const segmentCount = path.length;
    const scaledT = t * segmentCount;
    const segmentIndex = Math.min(Math.floor(scaledT), segmentCount - 1);
    const localT = scaledT - segmentIndex;

    const seg = path[segmentIndex];

    return [
        cubicBezier(localT, seg.p0[0], seg.p1[0], seg.p2[0], seg.p3[0]),
        cubicBezier(localT, seg.p0[1], seg.p1[1], seg.p2[1], seg.p3[1])
    ];
}

/**
 * Gets the tangent (direction) at a point on the path
 * Used for calculating bearing
 * 
 * @param {Array} path - Array of bezier segments
 * @param {number} t - Parameter (0-1)
 * @returns {[number, number]} - Tangent vector [dx, dy]
 */
function getTangentAt(path, t) {
    if (!path || path.length === 0) return [1, 0];

    const epsilon = 0.001;
    const t1 = clamp01(t - epsilon);
    const t2 = clamp01(t + epsilon);

    const p1 = evaluateAt(path, t1);
    const p2 = evaluateAt(path, t2);

    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return [1, 0];

    return [dx / length, dy / length];
}

/**
 * Calculates bearing from tangent
 * 
 * @param {Array} path - Bezier path
 * @param {number} t - Parameter (0-1)
 * @returns {number} - Bearing in degrees (0-360)
 */
function getBearingAt(path, t) {
    const [dx, dy] = getTangentAt(path, t);

    // Convert to bearing (north = 0, clockwise)
    let bearing = Math.atan2(dx, dy) * 180 / Math.PI;
    if (bearing < 0) bearing += 360;

    return bearing;
}

/**
 * Calculates curvature at a point
 * Used for banking and speed adjustment on curves
 * 
 * @param {Array} path - Bezier path
 * @param {number} t - Parameter (0-1)
 * @returns {number} - Curvature value (higher = tighter turn)
 */
function getCurvatureAt(path, t) {
    const epsilon = 0.005;

    const b1 = getBearingAt(path, clamp01(t - epsilon));
    const b2 = getBearingAt(path, clamp01(t + epsilon));

    let diff = Math.abs(b2 - b1);
    if (diff > 180) diff = 360 - diff;

    // Normalize by epsilon to get rate of change
    return diff / (epsilon * 2 * 180) * Math.PI;
}

// ═══════════════════════════════════════════════════════════════════════════
// ARC-LENGTH PARAMETERIZATION
// For constant-speed travel along the path
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculates approximate arc length of a bezier path
 * 
 * @param {Array} path - Bezier path
 * @param {number} samples - Number of samples (default: 100)
 * @returns {number} - Approximate arc length
 */
function getArcLength(path, samples = 100) {
    let length = 0;
    let prevPoint = evaluateAt(path, 0);

    for (let i = 1; i <= samples; i++) {
        const t = i / samples;
        const point = evaluateAt(path, t);

        const dx = point[0] - prevPoint[0];
        const dy = point[1] - prevPoint[1];
        length += Math.sqrt(dx * dx + dy * dy);

        prevPoint = point;
    }

    return length;
}

/**
 * Creates arc-length lookup table for constant-speed parameterization
 * 
 * @param {Array} path - Bezier path
 * @param {number} samples - Number of samples (default: 200)
 * @returns {Array} - Array of { t, arcLength } pairs
 */
function createArcLengthTable(path, samples = 200) {
    const table = [{ t: 0, arcLength: 0 }];
    let totalLength = 0;
    let prevPoint = evaluateAt(path, 0);

    for (let i = 1; i <= samples; i++) {
        const t = i / samples;
        const point = evaluateAt(path, t);

        const dx = point[0] - prevPoint[0];
        const dy = point[1] - prevPoint[1];
        totalLength += Math.sqrt(dx * dx + dy * dy);

        table.push({ t, arcLength: totalLength });
        prevPoint = point;
    }

    // Normalize to 0-1
    for (const entry of table) {
        entry.normalizedArcLength = entry.arcLength / totalLength;
    }

    return table;
}

/**
 * Reparameterizes t by arc length for constant-speed travel
 * 
 * @param {Array} arcLengthTable - Precomputed arc length table
 * @param {number} s - Normalized arc length (0-1)
 * @returns {number} - Corresponding t parameter
 */
function reparameterize(arcLengthTable, s) {
    s = clamp01(s);

    // Binary search for the right segment
    let low = 0;
    let high = arcLengthTable.length - 1;

    while (low < high - 1) {
        const mid = Math.floor((low + high) / 2);
        if (arcLengthTable[mid].normalizedArcLength < s) {
            low = mid;
        } else {
            high = mid;
        }
    }

    const entry1 = arcLengthTable[low];
    const entry2 = arcLengthTable[high];

    // Linear interpolation between entries
    const localS = (s - entry1.normalizedArcLength) /
        (entry2.normalizedArcLength - entry1.normalizedArcLength || 1);

    return lerp(entry1.t, entry2.t, localS);
}

// ═══════════════════════════════════════════════════════════════════════════
// ORBIT PATH GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a circular orbit path around a center point
 * 
 * @param {[number, number]} center - [lng, lat] center point
 * @param {number} radius - Radius in degrees
 * @param {number} startAngle - Starting angle in degrees
 * @param {number} endAngle - Ending angle in degrees
 * @param {number} segments - Number of path segments (default: 36)
 * @returns {Array} - Bezier path for the orbit
 */
function createOrbitPath(center, radius, startAngle = 0, endAngle = 360, segments = 36) {
    const points = [];
    const angleRange = endAngle - startAngle;

    for (let i = 0; i <= segments; i++) {
        const angle = (startAngle + (i / segments) * angleRange) * Math.PI / 180;
        points.push([
            center[0] + Math.sin(angle) * radius,
            center[1] + Math.cos(angle) * radius
        ]);
    }

    return createBezierPath(points, 0.3);
}

/**
 * Creates a spiral path (orbit with expanding radius)
 * 
 * @param {[number, number]} center - Center point
 * @param {number} startRadius - Starting radius
 * @param {number} endRadius - Ending radius
 * @param {number} rotations - Number of rotations
 */
function createSpiralPath(center, startRadius, endRadius, rotations = 1, segments = 72) {
    const points = [];
    const totalAngle = rotations * 360;

    for (let i = 0; i <= segments; i++) {
        const progress = i / segments;
        const angle = progress * totalAngle * Math.PI / 180;
        const radius = lerp(startRadius, endRadius, progress);

        points.push([
            center[0] + Math.sin(angle) * radius,
            center[1] + Math.cos(angle) * radius
        ]);
    }

    return createBezierPath(points, 0.4);
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMERA ROLL (BANKING)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculates banking angle based on curvature
 * Creates natural drone-like banking on turns
 * 
 * @param {Array} path - Bezier path
 * @param {number} t - Parameter (0-1)
 * @param {number} maxRoll - Maximum roll angle in degrees (default: 4)
 * @returns {number} - Roll angle in degrees
 */
function calculateBanking(path, t, maxRoll = 4) {
    const curvature = getCurvatureAt(path, t);

    // Get direction of turn (positive = right, negative = left)
    const epsilon = 0.01;
    const b1 = getBearingAt(path, clamp01(t));
    const b2 = getBearingAt(path, clamp01(t + epsilon));

    let bearingDelta = b2 - b1;
    if (bearingDelta > 180) bearingDelta -= 360;
    if (bearingDelta < -180) bearingDelta += 360;

    const turnDirection = Math.sign(bearingDelta);

    // Scale roll by curvature
    const rollMagnitude = Math.min(curvature * 100, 1) * maxRoll;

    return rollMagnitude * turnDirection;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculates bearing between two points
 */
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

/**
 * Calculates distance between two points (approximate, in degrees)
 */
function calculateDistance(from, to) {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Simplifies a path by removing points that are too close together
 * Improves performance for very dense route data
 */
function simplifyPath(points, tolerance = 0.0001) {
    if (points.length < 3) return points;

    const result = [points[0]];
    let lastPoint = points[0];

    for (let i = 1; i < points.length - 1; i++) {
        const dist = calculateDistance(lastPoint, points[i]);
        if (dist >= tolerance) {
            result.push(points[i]);
            lastPoint = points[i];
        }
    }

    // Always include last point
    result.push(points[points.length - 1]);

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const CameraPath = {
    // Path creation
    createBezierPath,
    createOffsetPath,
    createOrbitPath,
    createSpiralPath,

    // Path evaluation
    evaluateAt,
    getTangentAt,
    getBearingAt,
    getCurvatureAt,

    // Arc-length parameterization
    getArcLength,
    createArcLengthTable,
    reparameterize,

    // Banking
    calculateBanking,

    // Utilities
    calculateBearing,
    calculateDistance,
    simplifyPath
};

export default CameraPath;
