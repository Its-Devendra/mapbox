"use client";

import React from "react";

/**
 * Compass Component
 * A premium, functional compass that displays the current map bearing
 * and allows users to reset to north by clicking.
 * 
 * @param {number} bearing - Current map bearing in degrees (0 = north)
 * @param {function} onResetNorth - Callback to reset map bearing to 0
 * @param {object} theme - Theme object for styling
 */
export default function Compass({ bearing = 0, onResetNorth, theme = {} }) {
    // Normalize bearing from Mapbox (-180 to 180) to compass (0 to 360)
    const normalizedBearing = ((bearing % 360) + 360) % 360;

    // The compass needle needs to rotate opposite to the bearing
    // so that "N" always points to true north
    const needleRotation = -bearing;

    // Glass styling from theme (matching View Mode Toggle)
    const isGlass = theme.filterGlassEnabled !== false;
    const bgOpacity = isGlass ? (theme.filterGlassOpacity ?? 25) : (theme.filterTertiaryOpacity ?? 100);
    const blur = theme.filterGlassBlur ?? 50;
    const saturation = theme.filterGlassSaturation ?? 200;
    const borderOpacity = theme.filterBorderOpacity ?? 35;

    const bgColor = theme.filterTertiary || theme.tertiary || '#ffffff';
    const primaryColor = theme.filterPrimary || theme.primary || '#1e3a8a';
    const textColor = theme.filterSecondary || theme.secondary || '#ffffff';

    // Convert hex to rgba
    const hexToRgba = (hex, alpha) => {
        if (!hex) return 'rgba(255,255,255,0.25)';
        let c;
        if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
            c = hex.substring(1).split('');
            if (c.length === 3) {
                c = [c[0], c[0], c[1], c[1], c[2], c[2]];
            }
            c = '0x' + c.join('');
            return `rgba(${(c >> 16) & 255}, ${(c >> 8) & 255}, ${c & 255}, ${alpha})`;
        }
        return hex;
    };

    const containerStyle = {
        backgroundColor: hexToRgba(bgColor, bgOpacity / 100),
        borderColor: hexToRgba(bgColor, borderOpacity / 100),
        ...(isGlass && {
            backdropFilter: `blur(${blur}px) saturate(${saturation}%)`,
            WebkitBackdropFilter: `blur(${blur}px) saturate(${saturation}%)`,
        }),
    };

    return (
        <div
            className="absolute bottom-8 right-2 sm:bottom-10 sm:right-4 z-40"
            title="Click to reset to North"
        >
            <button
                onClick={onResetNorth}
                className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border shadow-lg cursor-pointer 
                   transition-all duration-300 hover:scale-105 hover:shadow-xl
                   flex items-center justify-center group"
                style={containerStyle}
                aria-label="Compass - Click to reset to North"
            >
                {/* Outer ring with cardinal directions */}
                <div
                    className="absolute inset-1 rounded-full border opacity-30"
                    style={{ borderColor: textColor }}
                />

                {/* Cardinal direction labels (fixed position) */}
                <div className="absolute inset-0 flex items-center justify-center">
                    {/* N - Top */}
                    <span
                        className="absolute top-1 text-[8px] sm:text-[9px] font-bold tracking-wider"
                        style={{ color: '#ef4444' }}
                    >
                        N
                    </span>
                    {/* E - Right */}
                    <span
                        className="absolute right-1.5 text-[7px] sm:text-[8px] font-medium opacity-60"
                        style={{ color: textColor }}
                    >
                        E
                    </span>
                    {/* S - Bottom */}
                    <span
                        className="absolute bottom-1 text-[7px] sm:text-[8px] font-medium opacity-60"
                        style={{ color: textColor }}
                    >
                        S
                    </span>
                    {/* W - Left */}
                    <span
                        className="absolute left-1.5 text-[7px] sm:text-[8px] font-medium opacity-60"
                        style={{ color: textColor }}
                    >
                        W
                    </span>
                </div>

                {/* Rotating compass needle */}
                <div
                    className="relative w-8 h-8 sm:w-10 sm:h-10 transition-transform duration-150 ease-out"
                    style={{ transform: `rotate(${needleRotation}deg)` }}
                >
                    {/* Needle SVG */}
                    <svg
                        viewBox="0 0 24 24"
                        className="w-full h-full"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        {/* North needle (red) */}
                        <path
                            d="M12 2L15 12H9L12 2Z"
                            fill="#ef4444"
                            stroke="#dc2626"
                            strokeWidth="0.5"
                        />
                        {/* South needle (white/gray) */}
                        <path
                            d="M12 22L9 12H15L12 22Z"
                            fill={textColor}
                            fillOpacity="0.6"
                            stroke={textColor}
                            strokeWidth="0.5"
                            strokeOpacity="0.3"
                        />
                        {/* Center dot */}
                        <circle
                            cx="12"
                            cy="12"
                            r="2"
                            fill={primaryColor}
                            stroke={textColor}
                            strokeWidth="0.5"
                        />
                    </svg>
                </div>

                {/* Hover glow effect */}
                <div
                    className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                    style={{ backgroundColor: primaryColor }}
                />

                {/* Bearing indicator (shows on hover) */}
                <div
                    className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[9px] font-mono
                     opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap"
                    style={{
                        backgroundColor: hexToRgba(bgColor, 80 / 100),
                        color: textColor,
                        ...(isGlass && {
                            backdropFilter: `blur(${blur}px)`,
                            WebkitBackdropFilter: `blur(${blur}px)`,
                        }),
                    }}
                >
                    {Math.round(normalizedBearing)}°
                </div>
            </button>
        </div>
    );
}
