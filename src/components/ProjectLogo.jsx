"use client";

import React, { useMemo } from 'react';
import { bustCache } from '@/utils/cacheUtils';

export default function ProjectLogo({ logo, width = 120, height = 40, position = 'left' }) {
    if (!logo) return null;

    // Bust cache for instant updates
    const logoSrc = useMemo(() => bustCache(logo), [logo]);

    const positionClass = position === 'right'
        ? 'right-2 sm:right-4'
        : 'left-2 sm:left-3';

    // Calculate mobile sizes (50% of original)
    const mobileWidth = Math.min(width * 0.5, 60);
    const mobileHeight = Math.min(height * 0.5, 24);

    return (
        <div
            className={`absolute top-2 sm:top-4 ${positionClass} z-10 pointer-events-none project-logo-container ${position}`}
        >
            {/* Clean container - no extra padding or background */}
            <div className="overflow-hidden rounded-lg sm:rounded-xl shadow-lg">
                {/* Mobile logo - hidden on sm and up */}
                <img
                    src={logoSrc}
                    alt="Project Logo"
                    className="sm:hidden block"
                    style={{
                        width: `${mobileWidth}px`,
                        height: `${mobileHeight}px`,
                        objectFit: 'cover'
                    }}
                />
                {/* Desktop logo - hidden on mobile */}
                <img
                    src={logoSrc}
                    alt="Project Logo"
                    className="hidden sm:block"
                    style={{
                        width: `${width}px`,
                        height: `${height}px`,
                        objectFit: 'cover'
                    }}
                />
            </div>
        </div>
    );
}
