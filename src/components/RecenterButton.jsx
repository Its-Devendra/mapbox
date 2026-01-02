"use client";

import React from "react";

/**
 * RecenterButton Component
 * A consistent map control button to reset the camera view.
 * Uses the project theme for styling (glassmorphism/colors).
 */
const RecenterButton = React.memo(function RecenterButton({ onClick, theme }) {
    // Theme Defaults
    const activeTheme = theme || {};
    const isGlass = activeTheme.filterGlassEnabled !== false;
    const bgOpacity = isGlass ? (activeTheme.filterGlassOpacity ?? 25) : (activeTheme.filterTertiaryOpacity ?? 100);
    const blur = activeTheme.filterGlassBlur ?? 50;
    const saturation = activeTheme.filterGlassSaturation ?? 200;
    const borderOpacity = activeTheme.filterBorderOpacity ?? 35;
    const bgColor = activeTheme.filterTertiary || activeTheme.tertiary || '#ffffff';
    const textColor = activeTheme.filterSecondary || activeTheme.secondary || '#ffffff';

    // Helper: Hex to RGBA
    const hexToRgba = (hex, alpha) => {
        if (!hex) return 'rgba(255,255,255,0.25)';
        let c;
        if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
            c = hex.substring(1).split('');
            if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
            c = '0x' + c.join('');
            return `rgba(${(c >> 16) & 255}, ${(c >> 8) & 255}, ${c & 255}, ${alpha})`;
        }
        return hex;
    };

    const buttonStyle = {
        backgroundColor: hexToRgba(bgColor, bgOpacity / 100),
        borderColor: hexToRgba(bgColor, borderOpacity / 100),
        ...(isGlass && {
            backdropFilter: `blur(${blur}px) saturate(${saturation}%)`,
            WebkitBackdropFilter: `blur(${blur}px) saturate(${saturation}%)`,
        }),
    };

    return (
        <button
            onClick={onClick}
            className="recenter-button group relative"
            title="Reset to default view"
        >
            <div
                className="w-12 h-12 rounded-full border shadow-lg flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl"
                style={buttonStyle}
            >
                <svg
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={textColor}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M3 11L22 2L13 21L11 13L3 11Z" />
                </svg>
            </div>
        </button>
    );
});

export default RecenterButton;
