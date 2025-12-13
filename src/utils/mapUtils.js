/**
 * Map Utilities
 * Centralized utility functions for map operations including
 * SVG sanitization, coordinate validation, and data formatting
 */

import { MAPBOX_CONFIG } from '@/constants/mapConfig';

/**
 * Sanitize SVG content to prevent XSS attacks
 * Removes potentially dangerous elements and attributes
 * Handles various SVG formats (with XML declarations, whitespace, etc.)
 * @param {string} svgString - Raw SVG string
 * @returns {string} Sanitized SVG string
 */
export function sanitizeSVG(svgString) {
  if (!svgString || typeof svgString !== 'string') {
    return null;
  }

  // Trim whitespace
  let content = svgString.trim();

  // Remove XML declaration if present
  content = content.replace(/<\?xml[^?]*\?>/gi, '');

  // Remove DOCTYPE if present
  content = content.replace(/<!DOCTYPE[^>]*>/gi, '');

  // Remove comments
  content = content.replace(/<!--[\s\S]*?-->/g, '');

  // Trim again after removals
  content = content.trim();

  // Check if SVG tag exists anywhere in the content
  if (!content.toLowerCase().includes('<svg')) {
    console.warn('Invalid SVG: no <svg> tag found in content');
    return null;
  }

  // Extract SVG content (from <svg to </svg>)
  const svgMatch = content.match(/<svg[\s\S]*<\/svg>/i);
  if (svgMatch) {
    content = svgMatch[0];
  } else {
    // Try to find opening SVG tag and use everything from there
    const svgStart = content.toLowerCase().indexOf('<svg');
    if (svgStart >= 0) {
      content = content.substring(svgStart);
    } else {
      console.warn('Invalid SVG: could not extract SVG content');
      return null;
    }
  }

  // Remove script tags and event handlers (security)
  content = content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '');

  return content;
}

/**
 * Validate coordinates are within valid ranges
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 * @returns {boolean} True if coordinates are valid
 */
export function validateCoordinates(lng, lat) {
  if (typeof lng !== 'number' || typeof lat !== 'number') {
    return false;
  }

  if (isNaN(lng) || isNaN(lat)) {
    return false;
  }

  if (lng < MAPBOX_CONFIG.MIN_LONGITUDE || lng > MAPBOX_CONFIG.MAX_LONGITUDE) {
    return false;
  }

  if (lat < MAPBOX_CONFIG.MIN_LATITUDE || lat > MAPBOX_CONFIG.MAX_LATITUDE) {
    return false;
  }

  return true;
}

/**
 * Convert SVG string to Image element for Mapbox
 * Includes error handling and proper cleanup
 * @param {string} svgString - Sanitized SVG string
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Promise<HTMLImageElement>} Promise resolving to image element
 */
export function createSVGImage(svgString, width = 32, height = 32) {
  return new Promise((resolve, reject) => {
    const sanitized = sanitizeSVG(svgString);
    
    if (!sanitized) {
      reject(new Error('Invalid or malicious SVG content'));
      return;
    }

    const img = new Image(width, height);
    const svgBlob = new Blob([sanitized], { 
      type: 'image/svg+xml;charset=utf-8' 
    });
    const url = URL.createObjectURL(svgBlob);

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('SVG image loading timeout'));
    }, 5000); // 5 second timeout

    img.onload = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = (error) => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG image'));
    };

    img.src = url;
  });
}

/**
 * Calculate bounds from an array of coordinates
 * @param {Array<[number, number]>} coordinates - Array of [lng, lat] pairs
 * @returns {Object} Bounds object with sw and ne corners
 */
export function calculateBounds(coordinates) {
  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  coordinates.forEach(([lng, lat]) => {
    if (validateCoordinates(lng, lat)) {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
  });

  if (minLng === Infinity) {
    return null;
  }

  return {
    sw: [minLng, minLat],
    ne: [maxLng, maxLat]
  };
}

/**
 * Format distance in meters to human-readable string
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance string
 */
export function formatDistance(meters) {
  if (typeof meters !== 'number' || isNaN(meters)) {
    return 'N/A';
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}

/**
 * Format duration in seconds to human-readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export function formatDuration(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds)) {
    return 'N/A';
  }

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 
    ? `${hours}h ${remainingMinutes}m` 
    : `${hours}h`;
}

/**
 * Debounce function to limit execution rate
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between executions in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 100) {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Generate a unique cache key from parameters
 * @param {string} prefix - Key prefix (e.g., 'directions')
 * @param {...any} params - Parameters to include in key
 * @returns {string} Cache key
 */
export function generateCacheKey(prefix, ...params) {
  return `${prefix}:${params.map(p => 
    typeof p === 'object' ? JSON.stringify(p) : String(p)
  ).join(':')}`;
}

/**
 * Retry async function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxAttempts - Maximum retry attempts
 * @param {number} baseDelay - Base delay for exponential backoff
 * @returns {Promise} Result of the function
 */
export async function retryWithBackoff(
  fn, 
  maxAttempts = MAPBOX_CONFIG.RETRY_ATTEMPTS,
  baseDelay = MAPBOX_CONFIG.RETRY_DELAY
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s, etc.
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Create a timeout promise
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise} Promise that rejects after timeout
 */
export function createTimeout(ms) {
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Request timeout')), ms)
  );
}

/**
 * Fetch with timeout
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>} Fetch response
 */
export async function fetchWithTimeout(url, options = {}, timeout = MAPBOX_CONFIG.API_TIMEOUT) {
  return Promise.race([
    fetch(url, options),
    createTimeout(timeout)
  ]);
}

/**
 * Validate and transform landmark/nearby place data
 * @param {Object} item - Landmark or nearby place object
 * @returns {Object|null} Validated and transformed object or null if invalid
 */
export function validateAndTransformMarker(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const { latitude, longitude, id, title } = item;

  // Validate required fields
  if (!id || !title) {
    console.warn('Marker missing required fields:', item);
    return null;
  }

  // Validate coordinates
  if (!validateCoordinates(longitude, latitude)) {
    console.warn('Invalid coordinates for marker:', { id, longitude, latitude });
    return null;
  }

  // Transform and return
  return {
    ...item,
    coordinates: [longitude, latitude]
  };
}

/**
 * Group markers by proximity for clustering
 * @param {Array} markers - Array of marker objects with coordinates
 * @param {number} threshold - Distance threshold for grouping (in map units)
 * @returns {Array} Array of marker groups
 */
export function groupMarkersByProximity(markers, threshold = 0.01) {
  const groups = [];
  const processed = new Set();

  markers.forEach((marker, index) => {
    if (processed.has(index)) return;

    const group = [marker];
    processed.add(index);

    markers.forEach((otherMarker, otherIndex) => {
      if (processed.has(otherIndex)) return;

      const [lng1, lat1] = marker.coordinates;
      const [lng2, lat2] = otherMarker.coordinates;

      const distance = Math.sqrt(
        Math.pow(lng2 - lng1, 2) + Math.pow(lat2 - lat1, 2)
      );

      if (distance < threshold) {
        group.push(otherMarker);
        processed.add(otherIndex);
      }
    });

    groups.push(group);
  });

  return groups;
}

/**
 * Get icon size with hierarchical fallback
 * Priority: 
 * - If category.useCategoryDefaults is true: Category default → Global default (32px)
 * - Otherwise: Individual size → Category default → Global default (32px)
 * @param {Object} item - Landmark or nearby place object
 * @param {Object} category - Category object (optional)
 * @returns {Object} Object with width and height properties
 */
export function getIconSize(item, category = null) {
  // If category forces defaults, ignore individual sizes
  if (category?.useCategoryDefaults) {
    const width = category?.defaultIconWidth ?? 32;
    const height = category?.defaultIconHeight ?? 32;
    return { width, height };
  }
  
  // Otherwise use normal hierarchy: individual → category → global
  const width = item?.iconWidth ?? category?.defaultIconWidth ?? 32;
  const height = item?.iconHeight ?? category?.defaultIconHeight ?? 32;
    
  return { width, height };
}

/**
 * Easing function for smooth animation (Ease In Out Cubic)
 * @param {number} t - Progress (0 to 1)
 * @returns {number} Eased progress
 */
export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
