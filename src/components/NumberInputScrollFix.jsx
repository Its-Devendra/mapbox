'use client';

import { useEffect } from 'react';

/**
 * Global utility to prevent scroll wheel from changing number input values
 * This is a common UX issue where users accidentally change values while scrolling
 */
export default function NumberInputScrollFix() {
    useEffect(() => {
        const handleWheel = (e) => {
            if (document.activeElement?.type === 'number') {
                document.activeElement.blur();
            }
        };

        // Use passive: false to allow preventDefault if needed, but blur is sufficient
        document.addEventListener('wheel', handleWheel, { passive: true });

        return () => {
            document.removeEventListener('wheel', handleWheel);
        };
    }, []);

    return null; // This component doesn't render anything
}
