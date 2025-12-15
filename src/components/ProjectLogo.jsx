"use client";

import React from 'react';

export default function ProjectLogo({ logo, width = 120, height = 40, position = 'left' }) {
    if (!logo) return null;

    const positionClass = position === 'right' ? 'right-4' : 'left-3';

    return (
        <div
            className={`absolute top-6 ${positionClass} z-10 pointer-events-none`}
        >
            <img
                src={logo}
                alt="Project Logo"
                className="object-contain"
                style={{
                    maxWidth: `${width}px`,
                    maxHeight: `${height}px`,
                    width: 'auto',
                    height: 'auto'
                }}
            />
        </div>
    );
}
