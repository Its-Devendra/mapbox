'use client';

import React, { useEffect, useState, useRef } from 'react';

/**
 * AspectRatioContainer - Constrains children to a specific aspect ratio
 * 
 * Used by controllers to match the receiver's viewport aspect ratio,
 * ensuring both display the same visible map area.
 * 
 * When enabled, this component calculates the largest rectangle with
 * the target aspect ratio that fits within the available space, then
 * centers it with letterbox/pillarbox bars around it.
 * 
 * @param {object} props
 * @param {number} props.targetAspectRatio - Target aspect ratio (width/height), e.g., 16/9 = 1.777
 * @param {React.ReactNode} props.children - Child elements to render inside the constrained container
 * @param {boolean} props.enabled - Whether to apply the aspect ratio constraint (default: true)
 * @param {string} props.backgroundColor - Background color for letterbox bars (default: '#000')
 */
export default function AspectRatioContainer({
    targetAspectRatio,
    children,
    enabled = true,
    backgroundColor = '#1a1a2e'
}) {
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: '100%', height: '100%' });

    useEffect(() => {
        if (!enabled || !targetAspectRatio || targetAspectRatio <= 0 || !containerRef.current) {
            return;
        }

        const calculateDimensions = () => {
            const container = containerRef.current;
            if (!container) return;

            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;

            if (containerWidth <= 0 || containerHeight <= 0) return;

            const containerAspect = containerWidth / containerHeight;

            let newWidth, newHeight;

            if (containerAspect > targetAspectRatio) {
                // Container is wider than target - constrain by height (pillarbox)
                newHeight = containerHeight;
                newWidth = containerHeight * targetAspectRatio;
            } else {
                // Container is taller than target - constrain by width (letterbox)
                newWidth = containerWidth;
                newHeight = containerWidth / targetAspectRatio;
            }

            console.log('📐 AspectRatioContainer calculating:', {
                containerWidth,
                containerHeight,
                containerAspect,
                targetAspectRatio,
                newWidth,
                newHeight,
                mode: containerAspect > targetAspectRatio ? 'pillarbox' : 'letterbox'
            });

            setDimensions({
                width: `${Math.floor(newWidth)}px`,
                height: `${Math.floor(newHeight)}px`
            });
        };

        // Calculate on mount
        calculateDimensions();

        // Recalculate on resize
        const resizeObserver = new ResizeObserver(calculateDimensions);
        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, [enabled, targetAspectRatio]);

    // If not enabled or no target ratio, render children directly
    if (!enabled || !targetAspectRatio || targetAspectRatio <= 0) {
        console.log('📐 AspectRatioContainer DISABLED - rendering children directly', { enabled, targetAspectRatio });
        return <>{children}</>;
    }

    console.log('📐 AspectRatioContainer ENABLED with ratio:', targetAspectRatio, 'dimensions:', dimensions);

    return (
        <div
            ref={containerRef}
            className="aspect-ratio-outer"
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                height: '100%',
                backgroundColor: backgroundColor,
                overflow: 'hidden',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
            }}
        >
            <div
                className="aspect-ratio-inner"
                style={{
                    width: dimensions.width,
                    height: dimensions.height,
                    position: 'relative',
                    flexShrink: 0,
                }}
            >
                {children}
            </div>
        </div>
    );
}
