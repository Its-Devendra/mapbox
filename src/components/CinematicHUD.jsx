/**
 * CinematicHUD - Iron Man-Style Travel Overlay
 * 
 * Premium glassmorphism HUD that appears during camera travel
 * showing route info, distance, progress, and destination.
 */

import React, { useEffect, useState, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = {
    container: {
        position: 'absolute',
        top: '24px',
        right: '24px',
        zIndex: 1000,
        pointerEvents: 'none',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    },

    hudPanel: {
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.75) 100%)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: '16px',
        border: '1px solid rgba(99, 179, 237, 0.3)',
        boxShadow: `
      0 25px 50px -12px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      0 0 40px rgba(59, 130, 246, 0.15)
    `,
        overflow: 'hidden',
        minWidth: '280px',
        maxWidth: '320px',
    },

    header: {
        padding: '16px 20px 12px',
        borderBottom: '1px solid rgba(99, 179, 237, 0.2)',
        background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%)',
    },

    statusIndicator: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
    },

    pulsingDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: '#22d3ee',
        boxShadow: '0 0 12px rgba(34, 211, 238, 0.6)',
        animation: 'pulse 1.5s ease-in-out infinite',
    },

    statusText: {
        fontSize: '11px',
        fontWeight: '600',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: '#22d3ee',
        fontFamily: 'system-ui, -apple-system, sans-serif',
    },

    destinationName: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#f1f5f9',
        margin: 0,
        lineHeight: 1.3,
        fontFamily: 'system-ui, -apple-system, sans-serif',
    },

    body: {
        padding: '16px 20px',
    },

    statsGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '16px',
    },

    statItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },

    statLabel: {
        fontSize: '10px',
        fontWeight: '500',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        color: '#64748b',
        fontFamily: 'system-ui, -apple-system, sans-serif',
    },

    statValue: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#e2e8f0',
        fontFamily: 'SF Mono, Monaco, monospace',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },

    progressContainer: {
        marginTop: '4px',
    },

    progressLabel: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
    },

    progressText: {
        fontSize: '11px',
        fontWeight: '600',
        color: '#94a3b8',
        fontFamily: 'system-ui, -apple-system, sans-serif',
    },

    progressPercent: {
        fontSize: '14px',
        fontWeight: '700',
        color: '#3b82f6',
        fontFamily: 'SF Mono, Monaco, monospace',
    },

    progressTrack: {
        height: '6px',
        background: 'rgba(51, 65, 85, 0.8)',
        borderRadius: '3px',
        overflow: 'hidden',
        position: 'relative',
    },

    progressBar: {
        height: '100%',
        background: 'linear-gradient(90deg, #3b82f6 0%, #22d3ee 100%)',
        borderRadius: '3px',
        transition: 'width 0.3s ease-out',
        boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)',
    },

    scanLine: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '30%',
        height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
        animation: 'scanLine 2s ease-in-out infinite',
    },

    footer: {
        padding: '12px 20px',
        borderTop: '1px solid rgba(99, 179, 237, 0.15)',
        background: 'rgba(15, 23, 42, 0.3)',
    },

    bearingContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },

    compass: {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        border: '2px solid rgba(99, 179, 237, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(30, 41, 59, 0.6)',
        position: 'relative',
    },

    compassArrow: {
        width: '2px',
        height: '12px',
        background: 'linear-gradient(180deg, #ef4444 50%, #f1f5f9 50%)',
        borderRadius: '1px',
        transformOrigin: 'center center',
        transition: 'transform 0.3s ease-out',
    },

    bearingText: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#cbd5e1',
        fontFamily: 'SF Mono, Monaco, monospace',
    },

    // Arrival State Styles
    arrivedBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1))',
        border: '1px solid rgba(34, 197, 94, 0.4)',
        borderRadius: '20px',
        marginBottom: '8px',
    },

    arrivedText: {
        fontSize: '11px',
        fontWeight: '700',
        letterSpacing: '1.5px',
        color: '#22c55e',
        fontFamily: 'system-ui, -apple-system, sans-serif',
    },
};

// Keyframes for animations (inject once)
const injectKeyframes = () => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('cinematic-hud-keyframes')) return;

    const style = document.createElement('style');
    style.id = 'cinematic-hud-keyframes';
    style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }
    @keyframes scanLine {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(400%); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(30px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideOut {
      from { opacity: 1; transform: translateX(0); }
      to { opacity: 0; transform: translateX(30px); }
    }
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
      50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.5); }
    }
  `;
    document.head.appendChild(style);
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const formatDistance = (meters) => {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
};

const formatDuration = (seconds) => {
    if (seconds < 60) {
        return `${Math.round(seconds)} sec`;
    }
    const mins = Math.round(seconds / 60);
    return `${mins} min`;
};

const getBearingDirection = (bearing) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(((bearing % 360) + 360) % 360 / 45) % 8;
    return directions[index];
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function CinematicHUD({
    isVisible = false,
    landmark = null,
    distance = 0,       // in meters
    duration = 0,       // in seconds
    progress = 0,       // 0-1
    bearing = 0,        // in degrees
    isArrived = false,
    theme = {}          // optional theme override
}) {
    const [mounted, setMounted] = useState(false);
    const [displayProgress, setDisplayProgress] = useState(0);
    const animationRef = useRef(null);

    // Inject keyframes on mount
    useEffect(() => {
        injectKeyframes();
        setMounted(true);
    }, []);

    // Smooth progress animation
    useEffect(() => {
        const target = progress * 100;
        const current = displayProgress;
        const diff = target - current;

        if (Math.abs(diff) < 0.5) {
            setDisplayProgress(target);
            return;
        }

        animationRef.current = requestAnimationFrame(() => {
            setDisplayProgress(current + diff * 0.1);
        });

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [progress, displayProgress]);

    // Don't render on server or when hidden
    if (!mounted || !isVisible) return null;

    const remainingDistance = distance * (1 - progress);
    const remainingDuration = duration * (1 - progress);

    return (
        <div
            style={{
                ...styles.container,
                animation: isVisible ? 'slideIn 0.4s ease-out forwards' : 'slideOut 0.3s ease-in forwards',
            }}
        >
            <div style={styles.hudPanel}>
                {/* Header */}
                <div style={styles.header}>
                    {isArrived ? (
                        <div style={styles.arrivedBadge}>
                            <span style={{ fontSize: '12px' }}>✓</span>
                            <span style={styles.arrivedText}>ARRIVED</span>
                        </div>
                    ) : (
                        <div style={styles.statusIndicator}>
                            <div style={styles.pulsingDot} />
                            <span style={styles.statusText}>Navigating to</span>
                        </div>
                    )}
                    <h3 style={styles.destinationName}>
                        {landmark?.title || 'Destination'}
                    </h3>
                </div>

                {/* Body */}
                <div style={styles.body}>
                    <div style={styles.statsGrid}>
                        <div style={styles.statItem}>
                            <span style={styles.statLabel}>Distance</span>
                            <span style={styles.statValue}>
                                📍 {formatDistance(isArrived ? distance : remainingDistance)}
                            </span>
                        </div>
                        <div style={styles.statItem}>
                            <span style={styles.statLabel}>Est. Time</span>
                            <span style={styles.statValue}>
                                ⏱️ {formatDuration(isArrived ? duration : remainingDuration)}
                            </span>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {!isArrived && (
                        <div style={styles.progressContainer}>
                            <div style={styles.progressLabel}>
                                <span style={styles.progressText}>Progress</span>
                                <span style={styles.progressPercent}>{Math.round(displayProgress)}%</span>
                            </div>
                            <div style={styles.progressTrack}>
                                <div
                                    style={{
                                        ...styles.progressBar,
                                        width: `${displayProgress}%`,
                                    }}
                                />
                                <div style={styles.scanLine} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer - Compass */}
                <div style={styles.footer}>
                    <div style={styles.bearingContainer}>
                        <div style={styles.compass}>
                            <div
                                style={{
                                    ...styles.compassArrow,
                                    transform: `rotate(${bearing}deg)`,
                                }}
                            />
                        </div>
                        <span style={styles.bearingText}>
                            {Math.round(bearing)}° {getBearingDirection(bearing)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
