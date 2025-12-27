/**
 * Server-side Mapbox Directions API utility
 * Based on useMapboxDirections.js but for server-side use
 */

import { MAPBOX_CONFIG } from '@/constants/mapConfig';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 
  "pk.eyJ1IjoiZGV2Yml0czA5IiwiYSI6ImNtYzkyZTR2dDE0MDAyaXMzdXRndjJ0M2EifQ.Jhhx-1tf_NzrZNfGX8wp_w";

/**
 * Get distance and duration using Mapbox Directions API
 * @param {Array} start - Starting coordinates [lng, lat]
 * @param {Array} end - Ending coordinates [lng, lat]
 * @param {string} profile - Travel mode: 'driving', 'walking', 'cycling'
 * @returns {Promise<Object>} { distance: number (meters), duration: number (seconds), error?: string }
 */
export async function getMapboxDistanceAndTime(start, end, profile = 'driving') {
  try {
    // Validate inputs
    if (!start || !end || start.length !== 2 || end.length !== 2) {
      return {
        distance: null,
        duration: null,
        error: 'Invalid coordinates provided'
      };
    }

    // Build URL (same format as useMapboxDirections.js line 58-59)
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${start[0]},${start[1]};${end[0]},${end[1]}`;
    const params = new URLSearchParams({
      geometries: 'geojson',
      access_token: MAPBOX_TOKEN
    });

    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MAPBOX_CONFIG.API_TIMEOUT || 10000);

    try {
      const response = await fetch(`${url}?${params}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Directions API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No route found');
      }

      const route = data.routes[0];
      
      return {
        distance: route.distance, // in meters
        duration: route.duration, // in seconds
        error: null
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.error('Mapbox Directions API error:', error);
    return {
      distance: null,
      duration: null,
      error: error.message || 'Failed to get directions'
    };
  }
}

/**
 * Convert meters to kilometers
 * @param {number} meters 
 * @returns {number} Kilometers rounded to 1 decimal
 */
export function metersToKm(meters) {
  if (!meters || isNaN(meters)) return null;
  return Math.round((meters / 1000) * 10) / 10;
}

/**
 * Convert seconds to minutes
 * @param {number} seconds 
 * @returns {number} Minutes (rounded)
 */
export function secondsToMinutes(seconds) {
  if (!seconds || isNaN(seconds)) return null;
  return Math.round(seconds / 60);
}

