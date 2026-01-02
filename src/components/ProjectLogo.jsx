"use client";

import React, { useMemo } from 'react';
import { bustCache } from '@/utils/cacheUtils';

export default function ProjectLogo({ logo, width = 120, height = 40, padding = 0, borderRadius = 'none', backgroundColor = null, isPreview = false, position = 'left', theme = {} }) {
    if (!logo) return null;

    // Bust cache for instant updates
    const logoSrc = useMemo(() => bustCache(logo), [logo]);

    const positionClass = position === 'right'
        ? 'right-3 sm:right-4'
        : 'left-3 sm:left-3'; // Update left-2 to left-3

    // Calculate mobile sizes (85% of original for better visibility)
    const mobileWidth = Math.min(width * 0.85, 120);
    const mobileHeight = Math.min(height * 0.85, 40);

    const activeTheme = theme || {};

    const radiusMap = {
        'none': 'rounded-none',
        'sm': 'rounded-sm',
        'md': 'rounded-md',
        'lg': 'rounded-lg',
        'full': 'rounded-full'
    };

    const radiusClass = radiusMap[borderRadius] || 'rounded-lg';

    // Style using theme properties (fallback to filter/tertiary defaults)
    const containerStyle = {
        backgroundColor: backgroundColor || (activeTheme.filterGlassEnabled !== false
            ? `${activeTheme.filterTertiary || activeTheme.tertiary || '#ffffff'}${Math.round((activeTheme.filterGlassOpacity ?? 25) * 2.55).toString(16).padStart(2, '0')}`
            : `${activeTheme.filterTertiary || activeTheme.tertiary || '#ffffff'}${Math.round((activeTheme.filterTertiaryOpacity ?? 100) * 2.55).toString(16).padStart(2, '0')}`),
        borderColor: `${activeTheme.filterTertiary || activeTheme.tertiary || '#ffffff'}${Math.round((activeTheme.filterBorderOpacity ?? 35) * 2.55).toString(16).padStart(2, '0')}`,
        ...(!backgroundColor && activeTheme.filterGlassEnabled !== false && {
            backdropFilter: `blur(${activeTheme.filterGlassBlur ?? 50}px) saturate(${activeTheme.filterGlassSaturation ?? 200}%)`,
            WebkitBackdropFilter: `blur(${activeTheme.filterGlassBlur ?? 50}px) saturate(${activeTheme.filterGlassSaturation ?? 200}%)`,
        }),
        borderWidth: '1px',
        padding: `${padding}px`
    };

    return (
        <div
            className={`${isPreview ? 'relative mx-auto mt-4' : `fixed top-3 sm:top-4 ${positionClass} z-10 pointer-events-none project-logo-container ${position}`}`}
        >
            <div
                className={`overflow-hidden shadow-lg flex items-center justify-center transition-all duration-300 ${radiusClass}`}
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
