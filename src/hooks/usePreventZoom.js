"use client";

import { useEffect } from 'react';

export default function usePreventZoom() {
    useEffect(() => {
        // Prevent pinch-to-zoom on touch devices
        const handleTouchStart = (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        };

        const handleTouchMove = (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        };

        // Prevent Ctrl + Wheel zoom on desktop
        const handleWheel = (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
            }
        };

        // Prevent Ctrl + +/- keys
        const handleKeyDown = (e) => {
            if (
                (e.ctrlKey || e.metaKey) &&
                (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')
            ) {
                e.preventDefault();
            }
        };

        // Add event listeners with non-passive option for touch to ensure preventDefault works
        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('wheel', handleWheel, { passive: false });
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('wheel', handleWheel);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);
}
