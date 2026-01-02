"use client";

import React, { useState, useEffect } from "react";

/**
 * FullScreenButton Component
 * A premium button that toggles full-screen mode.
 * Styled consistently with the Compass component.
 *
 * @param {object} theme - Theme object for styling
 * @param {boolean} isShifted - Whether to shift position up (when landmark card is visible)
 */
const FullScreenButton = React.memo(function FullScreenButton({
    theme = {},
    isShifted = false,
}) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isIPhone, setIsIPhone] = useState(false);

    // Handle fullscreen change events and detect iPhone
    useEffect(() => {
        // Check for iPhone
        if (typeof window !== 'undefined' && /iPhone/i.test(navigator.userAgent)) {
            setIsIPhone(true);
            return;
        }

        const handleFullscreenChange = () => {
            setIsFullscreen(
                !!(document.fullscreenElement ||
                    document.webkitFullscreenElement ||
                    document.mozFullScreenElement ||
                    document.msFullscreenElement)
            );
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
        document.addEventListener("mozfullscreenchange", handleFullscreenChange);
        document.addEventListener("MSFullscreenChange", handleFullscreenChange);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
            document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
            document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
        };
    }, []);

    // Don't render on iPhone
    if (isIPhone) return null;

    const toggleFullscreen = () => {
        if (!isFullscreen) {
            const element = document.documentElement;
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen();
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen();
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    };

    // Glass styling from theme
    const isGlass = theme.filterGlassEnabled !== false;
    const bgOpacity = isGlass
        ? theme.filterGlassOpacity ?? 25
        : theme.filterTertiaryOpacity ?? 100;
    const blur = theme.filterGlassBlur ?? 50;
    const saturation = theme.filterGlassSaturation ?? 200;
    const borderOpacity = theme.filterBorderOpacity ?? 35;

    const bgColor = theme.filterTertiary || theme.tertiary || "#ffffff";
    const primaryColor = theme.filterPrimary || theme.primary || "#1e3a8a";
    const textColor = theme.filterSecondary || theme.secondary || "#ffffff";

    // Convert hex to rgba
    const hexToRgba = (hex, alpha) => {
        if (!hex) return "rgba(255,255,255,0.25)";
        let c;
        if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
            c = hex.substring(1).split("");
            if (c.length === 3) {
                c = [c[0], c[0], c[1], c[1], c[2], c[2]];
            }
            c = "0x" + c.join("");
            return `rgba(${(c >> 16) & 255}, ${(c >> 8) & 255}, ${c & 255
                }, ${alpha})`;
        }
        return hex;
    };

    const containerStyle = {
        backgroundColor: hexToRgba(bgColor, bgOpacity / 100),
        borderColor: hexToRgba(bgColor, borderOpacity / 100),
        ...(isGlass && {
            backdropFilter: `blur(${blur}px) saturate(${saturation}%)`,
            WebkitBackdropFilter: `blur(${blur}px) saturate(${saturation}%)`,
        }),
    };

    return (
        <div
            className="fullscreen-btn-container"
            title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}
        >
            <button
                onClick={toggleFullscreen}
                className="relative w-12 h-12 rounded-full border shadow-lg cursor-pointer 
                   transition-all duration-300 hover:scale-105 hover:shadow-xl
                   flex items-center justify-center group"
                style={containerStyle}
                aria-label={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}
            >
                {/* Inner Icon */}
                <div className="relative w-6 h-6 opacity-80 group-hover:opacity-100 transition-opacity">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={textColor}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-full h-full"
                    >
                        {isFullscreen ? (
                            // Exit Full Screen Icon (Collapse)
                            <>
                                <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                                <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                                <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                                <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                            </>
                        ) : (
                            // Enter Full Screen Icon (Expand)
                            <>
                                <path d="M15 3h6v6" />
                                <path d="M9 21H3v-6" />
                                <path d="M21 3l-7 7" />
                                <path d="M3 21l7-7" />
                            </>
                        )}
                    </svg>
                </div>

                {/* Hover glow effect */}
                <div
                    className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                    style={{ backgroundColor: primaryColor }}
                />
            </button>
        </div>
    );
});

export default FullScreenButton;
