"use client";

import React from 'react';

export default function ProjectLogo({ logo, width = 120, height = 40 }) {
    if (!logo) return null;

    return (
        <div
            className="absolute top-6 left-6 z-10 pointer-events-none"
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
