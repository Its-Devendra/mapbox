"use client";

import React, { useMemo } from 'react';
import { bustCache } from '@/utils/cacheUtils';

export default function ProjectLogo({ logo, width = 120, height = 40, position = 'left', theme = {} }) {
    if (!logo) return null;

    // Bust cache for instant updates
    const logoSrc = useMemo(() => bustCache(logo), [logo]);

    const positionClass = position === 'right'
        ? 'right-2 sm:right-4'
        : 'left-2 sm:left-3';

    // Calculate mobile sizes (50% of original)
    const mobileWidth = Math.min(width * 0.5, 60);
    const mobileHeight = Math.min(height * 0.5, 24);

    const activeTheme = theme || {};

    // Style using theme properties (fallback to filter/tertiary defaults)
    const containerStyle = {
        backgroundColor: activeTheme.filterGlassEnabled !== false
            ? `${activeTheme.filterTertiary || activeTheme.tertiary || '#ffffff'}${Math.round((activeTheme.filterGlassOpacity ?? 25) * 2.55).toString(16).padStart(2, '0')}`
            : `${activeTheme.filterTertiary || activeTheme.tertiary || '#ffffff'}${Math.round((activeTheme.filterTertiaryOpacity ?? 100) * 2.55).toString(16).padStart(2, '0')}`,
        borderColor: `${activeTheme.filterTertiary || activeTheme.tertiary || '#ffffff'}${Math.round((activeTheme.filterBorderOpacity ?? 35) * 2.55).toString(16).padStart(2, '0')}`,
        ...(activeTheme.filterGlassEnabled !== false && {
            backdropFilter: `blur(${activeTheme.filterGlassBlur ?? 50}px) saturate(${activeTheme.filterGlassSaturation ?? 200}%)`,
            WebkitBackdropFilter: `blur(${activeTheme.filterGlassBlur ?? 50}px) saturate(${activeTheme.filterGlassSaturation ?? 200}%)`,
        }),
        borderWidth: '1px',
    };

    return (
        <div
            className={`absolute top-2 sm:top-4 ${positionClass} z-10 pointer-events-none project-logo-container ${position}`}
        >
            <div
                className="overflow-hidden rounded-lg sm:rounded-xl shadow-lg p-0 flex items-center justify-center transition-all duration-300"
                style={containerStyle}
            >
                {/* Mobile logo - hidden on sm and up */}
                <img
                    src={logoSrc}
                    alt="Project Logo"
                    className="sm:hidden block"
                    style={{
                        height: `${mobileHeight}px`,
                        width: 'auto',
                        maxWidth: `${mobileWidth}px`,
                        objectFit: 'contain'
                    }}
                />
                {/* Desktop logo - hidden on mobile */}
                <img
                    src={logoSrc}
                    alt="Project Logo"
                    className="hidden sm:block"
                    style={{
                        height: `${height}px`,
                        width: 'auto',
                        maxWidth: `${width}px`,
                        objectFit: 'contain'
                    }}
                />
            </div>
        </div>
    );
}
