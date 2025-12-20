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
            {/* Background container with frosted glass effect */}
            <div className="bg-white/90 backdrop-blur-md rounded-lg sm:rounded-xl shadow-lg p-1.5 sm:p-2.5 border border-white/50">
                {/* Mobile logo - hidden on sm and up */}
                <img
                    src={logoSrc}
                    alt="Project Logo"
                    className="object-contain sm:hidden"
                    style={{
                        maxWidth: `${mobileWidth}px`,
                        maxHeight: `${mobileHeight}px`,
                        width: 'auto',
                        height: 'auto'
                    }}
                />
                {/* Desktop logo - hidden on mobile */}
                <img
                    src={logoSrc}
                    alt="Project Logo"
                    className="object-contain hidden sm:block"
                    style={{
                        maxWidth: `${width}px`,
                        maxHeight: `${height}px`,
                        width: 'auto',
                        height: 'auto'
                    }}
                />
            </div>
        </div>
    );
}
