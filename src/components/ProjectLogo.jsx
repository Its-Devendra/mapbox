"use client";

import React from 'react';

export default function ProjectLogo({ logo, width = 120, height = 40, position = 'left' }) {
    if (!logo) return null;

    const positionClass = position === 'right' ? 'right-6' : 'left-6';

    return (
        <div
            className={`absolute top-6 ${positionClass} z-10 pointer-events-none`}
            style={{
                width: `${width}px`,
                height: `${height}px`
            }}
        >
            <img
                src={logo}
                alt="Project Logo"
                className="w-full h-full object-contain"
            />
        </div>
    );
}
