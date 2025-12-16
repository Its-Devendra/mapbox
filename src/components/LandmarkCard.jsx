"use client";

import React, { useState, useEffect } from 'react';

export default function LandmarkCard({ landmark, clientBuilding, onClose, isVisible, theme, className = "fixed bottom-32 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-28 lg:bottom-32 xl:bottom-36 sm:max-w-sm" }) {
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
  const [imageError, setImageError] = useState(false); // Track if image failed to load

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

  if (!isVisible || !landmark) return null;

  // Extract category name - use pre-extracted categoryName if available
  const categoryName = landmark.categoryName ||
    (typeof landmark.category === 'object' && landmark.category !== null
      ? (landmark.category?.name || 'Uncategorized')
      : (landmark.category || 'Uncategorized'));

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  // Placeholder gradient background (no external image needed)
  const renderPlaceholder = () => (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700">
      <svg className="w-16 h-16 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </div>
  );

  return (
    <div className={`${className} z-20 w-full landmark-card-container`}>
      <div
        className="backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-500 ease-out"
        style={{
          backgroundColor: cardTheme.primary,
          borderColor: cardTheme.tertiary,
          borderWidth: '1px',
          borderStyle: 'solid'
        }}
      >
        {/* Mobile: Horizontal layout | Desktop: Vertical layout */}
        <div className="flex flex-row sm:flex-col">
          {/* Hero Image Section */}
          <div className="relative w-28 h-28 sm:w-full sm:h-40 overflow-hidden flex-shrink-0 hero-image">
            {/* Show image only if we have one and it hasn't errored */}
            {landmark.image && !imageError ? (
              <img
                src={landmark.image}
                alt={landmark.title}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              renderPlaceholder()
            )}
            {/* Close button - visible on desktop only in image area */}
            <div className="absolute top-2 right-2 hidden sm:block">
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer close-button"
                style={{
                  backgroundColor: `${cardTheme.secondary}20`,
                  color: cardTheme.secondary
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = `${cardTheme.secondary}30`;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = `${cardTheme.secondary}20`;
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-6 flex-1 min-w-0 card-content">
            {/* Mobile close button - inline with title */}
            <div className="flex items-start justify-between gap-2 sm:block">
              <div className="flex-1 min-w-0">
                {/* Title */}
                <h2
                  className="text-base sm:text-2xl font-bold mb-1 sm:mb-2 truncate sm:whitespace-normal card-title"
                  style={{ color: cardTheme.secondary }}
                >
                  {landmark.title}
                </h2>

                {/* Category and Stats - Inline on mobile */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-6">
                  <span
                    className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium"
                    style={{
                      backgroundColor: `${cardTheme.secondary}20`,
                      color: cardTheme.secondary
                    }}
                  >
                    {categoryName}
                  </span>

                  {/* Distance and Time */}
                  <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-1">
                      <svg
                        className="w-3 h-3 sm:w-4 sm:h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        style={{ color: cardTheme.secondary }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <span style={{ color: cardTheme.secondary }}>
                        {loading ? '...' : `${distance} km`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg
                        className="w-3 h-3 sm:w-4 sm:h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        style={{ color: cardTheme.secondary }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span style={{ color: cardTheme.secondary }}>
                        {loading ? '...' : formatDuration(duration)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile close button */}
              <button
                onClick={onClose}
                className="sm:hidden w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 close-button"
                style={{
                  backgroundColor: `${cardTheme.secondary}20`,
                  color: cardTheme.secondary
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Description - truncated on mobile */}
            {landmark.description && (
              <p
                className="text-xs sm:text-sm leading-relaxed line-clamp-2 sm:line-clamp-none card-description"
                style={{ color: `${cardTheme.secondary}80` }}
              >
                {landmark.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
