"use client";

import React, { useState, useEffect } from 'react';
import { bustCache } from '@/utils/cacheUtils';

export default function LandmarkCard({
  landmark,
  clientBuilding,
  onClose,
  isVisible,
  theme,
  className = "fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-24 sm:max-w-sm"
}) {
  // Use provided theme or fallback to default
  const cardTheme = theme || {
    primary: '#1e3a8a',
    secondary: '#ffffff',
    tertiary: '#64748b',
    quaternary: '#f1f5f9'
  };

  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate in when becoming visible
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setIsAnimating(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [isVisible]);

  // Calculate distance and duration when landmark changes
  useEffect(() => {
    if (landmark && clientBuilding) {
      calculateDistanceAndTime();
    }
  }, [landmark, clientBuilding]);

  // Reset image error when landmark changes
  useEffect(() => {
    setImageError(false);
  }, [landmark?.id]);

  const calculateDistanceAndTime = async () => {
    if (!landmark || !clientBuilding) return;

    setLoading(true);
    try {
      const start = clientBuilding.coordinates;
      const end = landmark.coordinates;

      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?access_token=pk.eyJ1IjoiZGV2Yml0czA5IiwiYSI6ImNtYzkyZTR2dDE0MDAyaXMzdXRndjJ0M2EifQ.Jhhx-1tf_NzrZNfGX8wp_w`
      );

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = (route.distance / 1000).toFixed(1);
        const durationMinutes = Math.round(route.duration / 60);

        setDistance(distanceKm);
        setDuration(durationMinutes);
      }
    } catch (error) {
      console.error('Error calculating distance:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to convert hex to rgba
  const hexToRgba = (hex, alpha) => {
    if (!hex) return `rgba(255, 255, 255, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  if (!isVisible || !landmark) return null;

  // Extract category name
  const categoryName = landmark.categoryName ||
    (typeof landmark.category === 'object' && landmark.category !== null
      ? (landmark.category?.name || 'Uncategorized')
      : (landmark.category || 'Uncategorized'));

  const formatDuration = (minutes) => {
    if (!minutes) return '--';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const hasImage = landmark.image && !imageError;

  // Glass base color
  const glassBaseColor = cardTheme.tertiary || '#ffffff';

  return (
    <div
      className={`${className} z-20 w-full landmark-card-container`}
      style={{
        transform: isAnimating ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
        opacity: isAnimating ? 1 : 0,
        transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out',
      }}
    >
      <style jsx>{`
        .ios-glass-card {
          -webkit-backdrop-filter: blur(${(theme?.landmarkGlassEnabled !== false) ? (theme?.landmarkGlassBlur ?? 50) : 0}px) saturate(${(theme?.landmarkGlassEnabled !== false) ? (theme?.landmarkGlassSaturation ?? 180) : 100}%);
          backdrop-filter: blur(${(theme?.landmarkGlassEnabled !== false) ? (theme?.landmarkGlassBlur ?? 50) : 0}px) saturate(${(theme?.landmarkGlassEnabled !== false) ? (theme?.landmarkGlassSaturation ?? 180) : 100}%);
        }
      `}</style>

      <div
        className="ios-glass-card rounded-lg overflow-hidden relative"
        style={{
          backgroundColor: theme?.landmarkGlassEnabled !== false
            ? hexToRgba(glassBaseColor, (theme?.landmarkGlassOpacity ?? 25) / 100)
            : hexToRgba(glassBaseColor, (theme?.tertiaryOpacity ?? 100) / 100),
          border: `1px solid ${hexToRgba(glassBaseColor, (theme?.landmarkBorderOpacity ?? 35) / 100)}`,
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            color: '#ffffff'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Horizontal Layout: Image Left, Content Right */}
        <div className="flex flex-row">
          {/* Left: Image */}
          {hasImage && (
            <div className="w-28 flex-shrink-0 overflow-hidden">
              <img
                src={bustCache(landmark.image)}
                alt={landmark.title}
                className="w-full h-full object-cover"
                style={{ minHeight: '120px' }}
                onError={() => setImageError(true)}
              />
            </div>
          )}

          {/* Right: Content */}
          <div className="flex-1 p-3 pr-10 min-w-0 flex flex-col justify-center">
            {/* Category Badge */}
            <span
              className="inline-flex items-center self-start px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider mb-2"
              style={{
                backgroundColor: cardTheme.primary,
                color: cardTheme.secondary,
              }}
            >
              {categoryName}
            </span>

            {/* Title - WHITE text */}
            <h2 className="text-sm font-bold mb-1 leading-tight text-white">
              {landmark.title}
            </h2>

            {/* Description - Light white text */}
            {landmark.description && (
              <p className="text-[11px] leading-snug mb-2.5 line-clamp-2 text-white/70">
                {landmark.description}
              </p>
            )}

            {/* Stats Row */}
            <div className="flex items-center gap-2">
              {/* Distance */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '0.5px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-[11px] font-semibold text-white">
                  {loading ? '...' : `${distance || '--'} km`}
                </span>
              </div>

              {/* Duration */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '0.5px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[11px] font-semibold text-white">
                  {loading ? '...' : formatDuration(duration)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
