/**
 * Custom hook for Mapbox Directions API
 * Provides caching, error handling, retry logic, and request deduplication
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { MAPBOX_CONFIG } from '@/constants/mapConfig';
import { directionsCache, requestDeduplicator } from '@/utils/cache';
import { generateCacheKey, retryWithBackoff, fetchWithTimeout } from '@/utils/mapUtils';

// Mapbox access token (should be in environment variable in production)
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 
  "pk.eyJ1IjoiZGV2Yml0czA5IiwiYSI6ImNtYzkyZTR2dDE0MDAyaXMzdXRndjJ0M2EifQ.Jhhx-1tf_NzrZNfGX8wp_w";

export function useMapboxDirections() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  /**
   * Get directions between two points with caching
   * @param {Array} start - Starting coordinates [lng, lat]
   * @param {Array} end - Ending coordinates [lng, lat]
   * @param {string} profile - Travel mode: 'driving', 'walking', 'cycling'
   * @returns {Promise<Object>} Directions data with route, distance, and duration
   */
  const getDirections = useCallback(async (start, end, profile = 'driving') => {
    // Validate inputs
    if (!start || !end || start.length !== 2 || end.length !== 2) {
      throw new Error('Invalid coordinates provided');
    }

    // Generate cache key
    const cacheKey = generateCacheKey('directions', start, end, profile);

    // Check cache first
    const cached = directionsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    setLoading(true);
    setError(null);

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      // Use request deduplicator to avoid duplicate simultaneous calls
      const result = await requestDeduplicator.execute(cacheKey, async () => {
        const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${start[0]},${start[1]};${end[0]},${end[1]}`;
        const params = new URLSearchParams({
          geometries: 'geojson',
          access_token: MAPBOX_TOKEN
        });

        // Fetch with timeout and retry logic
        const response = await retryWithBackoff(async () => {
          return await fetchWithTimeout(
            `${url}?${params}`,
            { signal: abortControllerRef.current.signal },
            MAPBOX_CONFIG.API_TIMEOUT
          );
        });

        if (!response.ok) {
          throw new Error(`Directions API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.routes || data.routes.length === 0) {
          throw new Error('No route found');
        }

        const route = data.routes[0];
        
        return {
          geometry: route.geometry,
          distance: route.distance, // in meters
          duration: route.duration, // in seconds
          legs: route.legs
        };
      });

      // Cache the result
      directionsCache.set(cacheKey, result);

      setLoading(false);
      return result;

    } catch (err) {
      // Don't set error for aborted requests
      if (err.name === 'AbortError') {
        setLoading(false);
        return null;
      }

      console.error('Directions API error:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  /**
   * Calculate distance and duration only (lighter request)
   * @param {Array} start - Starting coordinates [lng, lat]
   * @param {Array} end - Ending coordinates [lng, lat]
   * @param {string} profile - Travel mode
   * @returns {Promise<Object>} Object with distance and duration
   */
  const getDistanceAndDuration = useCallback(async (start, end, profile = 'driving') => {
    try {
      const result = await getDirections(start, end, profile);
      return {
        distance: result.distance,
        duration: result.duration
      };
    } catch (err) {
      return {
        distance: null,
        duration: null,
        error: err.message
      };
    }
  }, [getDirections]);

  /**
   * Cancel ongoing request
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  }, []);

  /**
   * Clear cache
   */
  const clearCache = useCallback(() => {
    directionsCache.clear();
  }, []);

  return {
    getDirections,
    getDistanceAndDuration,
    cancel,
    clearCache,
    loading,
    error
  };
}

export default useMapboxDirections;
