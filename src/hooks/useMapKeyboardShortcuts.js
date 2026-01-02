import { useEffect, useCallback } from 'react';

/**
 * useMapKeyboardShortcuts Hook
 * Provides keyboard shortcuts for common map interactions.
 * 
 * Shortcuts:
 * - R: Recenter/Reset camera
 * - F: Toggle fullscreen
 * - 2: Switch to 2D (top) view
 * - 3: Switch to 3D (tilted) view
 * - Escape: Close landmark card
 * - +/=: Zoom in
 * - -: Zoom out
 *
 * @param {object} options - Configuration options
 * @param {object} options.mapRef - Ref to Mapbox map instance
 * @param {function} options.resetCamera - Function to reset camera to default
 * @param {function} options.setViewMode - Function to set view mode ('top' | 'tilted')
 * @param {function} options.closeLandmarkCard - Function to close the landmark card
 * @param {boolean} options.enabled - Whether shortcuts are enabled (default: true)
 */
export default function useMapKeyboardShortcuts({
    mapRef,
    resetCamera,
    setViewMode,
    closeLandmarkCard,
    enabled = true
}) {
    const handleKeyDown = useCallback((event) => {
        // Don't trigger shortcuts if user is typing in an input
        if (
            event.target.tagName === 'INPUT' ||
            event.target.tagName === 'TEXTAREA' ||
            event.target.isContentEditable
        ) {
            return;
        }

        const map = mapRef?.current;
        if (!map) return;

        switch (event.key.toLowerCase()) {
            case 'r':
                // Recenter camera
                event.preventDefault();
                resetCamera?.();
                break;

            case 'f':
                // Toggle fullscreen
                event.preventDefault();
                if (document.fullscreenElement) {
                    document.exitFullscreen?.();
                } else {
                    document.documentElement.requestFullscreen?.();
                }
                break;

            case '2':
                // Switch to 2D view
                event.preventDefault();
                setViewMode?.('top');
                break;

            case '3':
                // Switch to 3D view
                event.preventDefault();
                setViewMode?.('tilted');
                break;

            case 'escape':
                // Close landmark card
                closeLandmarkCard?.();
                break;

            case '=':
            case '+':
                // Zoom in
                event.preventDefault();
                map.zoomIn({ duration: 300 });
                break;

            case '-':
                // Zoom out
                event.preventDefault();
                map.zoomOut({ duration: 300 });
                break;

            default:
                break;
        }
    }, [mapRef, resetCamera, setViewMode, closeLandmarkCard]);

    useEffect(() => {
        if (!enabled) return;

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [enabled, handleKeyDown]);
}
