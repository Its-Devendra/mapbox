"use client";

import React, { useState, useEffect } from 'react';

export default function LandmarkCard({ landmark, clientBuilding, onClose, isVisible, theme, className = "fixed bottom-26 right-6" }) {
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
    <div className={`${className} z-20 w-full max-w-sm`}>
      <div
        className="backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-500 ease-out"
        style={{
          backgroundColor: cardTheme.primary,
          borderColor: cardTheme.tertiary,
          borderWidth: '1px',
          borderStyle: 'solid'
        }}
      >
        {/* Hero Image Section */}
        <div className="relative h-40 overflow-hidden">
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
          <div className="absolute top-4 right-4">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer"
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
        <div className="p-6">
          {/* Title and Category */}
          <div className="mb-6">
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: cardTheme.secondary }}
            >
              {landmark.title}
            </h2>
            <div className="flex items-center space-x-3">
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: `${cardTheme.secondary}20`,
                  color: cardTheme.secondary
                }}
              >
                {categoryName}
              </span>
              {/* Distance and Time beside category */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: cardTheme.secondary }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span
                    className="text-sm font-medium"
                    style={{ color: cardTheme.secondary }}
                  >
                    {loading ? (
                      <div
                        className="w-8 h-4 rounded animate-pulse"
                        style={{ backgroundColor: `${cardTheme.secondary}20` }}
                      ></div>
                    ) : (
                      `${distance} km`
                    )}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: cardTheme.secondary }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span
                    className="text-sm font-medium"
                    style={{ color: cardTheme.secondary }}
                  >
                    {loading ? (
                      <div
                        className="w-8 h-4 rounded animate-pulse"
                        style={{ backgroundColor: `${cardTheme.secondary}20` }}
                      ></div>
                    ) : (
                      formatDuration(duration)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <p
            className="text-sm leading-relaxed"
            style={{ color: `${cardTheme.secondary}80` }}
          >
            {landmark.description}
          </p>
        </div>
      </div>
    </div>
  );
}
