"use client";

import { useState, useEffect } from 'react';
import { Link2, Unlink } from 'lucide-react';

/**
 * Size input component with aspect ratio lock feature
 * @param {Object} props
 * @param {number} props.width - Current width value
 * @param {number} props.height - Current height value
 * @param {string} props.widthName - Name attribute for width input
 * @param {string} props.heightName - Name attribute for height input
 * @param {Function} props.onWidthChange - Callback when width changes
 * @param {Function} props.onHeightChange - Callback when height changes
 * @param {number} props.min - Minimum value (default: 10)
 * @param {number} props.max - Maximum value (default: 500)
 * @param {string} props.widthLabel - Label for width input (default: "Width (px)")
 * @param {string} props.heightLabel - Label for height input (default: "Height (px)")
 */
export default function AspectRatioSizeInput({
    width,
    height,
    widthName = "width",
    heightName = "height",
    onWidthChange,
    onHeightChange,
    min = 10,
    max = 500,
    widthLabel = "Width (px)",
    heightLabel = "Height (px)",
    defaultLocked = true
}) {
    const [aspectRatioLocked, setAspectRatioLocked] = useState(defaultLocked);
    const [aspectRatio, setAspectRatio] = useState(null);

    // Calculate and store aspect ratio on initial render if locked by default
    useEffect(() => {
        if (aspectRatioLocked && width && height && !aspectRatio) {
            setAspectRatio(width / height);
        }
    }, [aspectRatioLocked, width, height]);

    const handleWidthChange = (e) => {
        const newWidth = parseFloat(e.target.value);

        if (isNaN(newWidth)) {
            onWidthChange(e);
            return;
        }

        onWidthChange(e);

        // If aspect ratio is locked, calculate new height
        if (aspectRatioLocked && aspectRatio && newWidth) {
            const newHeight = Math.round(newWidth / aspectRatio);
            // Clamp to min/max
            const clampedHeight = Math.max(min, Math.min(max, newHeight));

            // Create synthetic event for height
            const syntheticEvent = {
                target: {
                    name: e.target.name.replace('Width', 'Height'),
                    value: clampedHeight.toString(),
                    type: 'number'
                }
            };
            onHeightChange(syntheticEvent);
        }
    };

    const handleHeightChange = (e) => {
        const newHeight = parseFloat(e.target.value);

        if (isNaN(newHeight)) {
            onHeightChange(e);
            return;
        }

        onHeightChange(e);

        // If aspect ratio is locked, calculate new width
        if (aspectRatioLocked && aspectRatio && newHeight) {
            const newWidth = Math.round(newHeight * aspectRatio);
            // Clamp to min/max
            const clampedWidth = Math.max(min, Math.min(max, newWidth));

            // Create synthetic event for width
            const syntheticEvent = {
                target: {
                    name: e.target.name.replace('Height', 'Width'),
                    value: clampedWidth.toString(),
                    type: 'number'
                }
            };
            onWidthChange(syntheticEvent);
        }
    };

    const toggleAspectRatioLock = () => {
        if (!aspectRatioLocked && width && height) {
            // Enabling lock - store current aspect ratio
            setAspectRatio(width / height);
        }
        setAspectRatioLocked(!aspectRatioLocked);
    };

    return (
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {widthLabel}
                </label>
                <input
                    type="number"
                    name={widthName}
                    value={width || ''}
                    onChange={handleWidthChange}
                    min={min}
                    max={max}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-sm placeholder:text-gray-400 transition-all cursor-text"
                    placeholder="120"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {heightLabel}
                </label>
                <input
                    type="number"
                    name={heightName}
                    value={height || ''}
                    onChange={handleHeightChange}
                    min={min}
                    max={max}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-sm placeholder:text-gray-400 transition-all cursor-text"
                    placeholder="40"
                />
            </div>

            {/* Aspect Ratio Lock Toggle */}
            <div className="col-span-2">
                <button
                    type="button"
                    onClick={toggleAspectRatioLock}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${aspectRatioLocked
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                        }`}
                >
                    {aspectRatioLocked ? (
                        <>
                            <Link2 className="w-3.5 h-3.5" strokeWidth={2} />
                            Aspect Ratio Locked
                            {aspectRatio && <span className="text-blue-600">({aspectRatio.toFixed(2)})</span>}
                        </>
                    ) : (
                        <>
                            <Unlink className="w-3.5 h-3.5" strokeWidth={2} />
                            Lock Aspect Ratio
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
