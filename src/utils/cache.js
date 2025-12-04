/**
 * LRU (Least Recently Used) Cache with TTL support
 * Optimized for caching API responses and computed values
 */

import { MAPBOX_CONFIG } from '@/constants/mapConfig';

class CacheEntry {
  constructor(value, ttl) {
    this.value = value;
    this.timestamp = Date.now();
    this.ttl = ttl;
  }

  isExpired() {
    if (!this.ttl) return false;
    return Date.now() - this.timestamp > this.ttl;
  }
}

export class LRUCache {
  constructor(maxSize = MAPBOX_CONFIG.MAX_CACHE_SIZE) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or undefined
   */
  get(key) {
    if (!this.cache.has(key)) {
      return undefined;
    }

    const entry = this.cache.get(key);

    // Check if expired
    if (entry.isExpired()) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = MAPBOX_CONFIG.CACHE_TTL) {
    // Delete if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    // Add new entry
    this.cache.set(key, new CacheEntry(value, ttl));
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is valid
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.isExpired()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete specific key
   * @param {string} key - Cache key to delete
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   * @returns {number} Number of entries cleared
   */
  clearExpired() {
    let cleared = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.isExpired()) {
        this.cache.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Get cache size
   * @returns {number} Number of entries in cache
   */
  size() {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;

    for (const entry of this.cache.values()) {
      if (entry.isExpired()) {
        expired++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      expired,
      utilizationPercent: (this.cache.size / this.maxSize * 100).toFixed(2)
    };
  }
}

// Create singleton instances for different cache types
export const directionsCache = new LRUCache(50);
export const iconCache = new LRUCache(100);
export const apiResponseCache = new LRUCache(50);

/**
 * Cached directions API call
 * @param {Function} fetchFn - Function that returns Promise of directions data
 * @param {string} cacheKey - Unique cache key for this request
 * @param {number} ttl - Time to live for cache entry
 * @returns {Promise} Directions data
 */
export async function cachedDirections(fetchFn, cacheKey, ttl) {
  // Check cache first
  const cached = directionsCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Fetch and cache
  const result = await fetchFn();
  directionsCache.set(cacheKey, result, ttl);
  
  return result;
}

/**
 * Cache for pending requests to avoid duplicate simultaneous calls
 */
class RequestDeduplicator {
  constructor() {
    this.pending = new Map();
  }

  /**
   * Execute request or return pending promise if already in flight
   * @param {string} key - Request key
   * @param {Function} fetchFn - Function that returns Promise
   * @returns {Promise} Request result
   */
  async execute(key, fetchFn) {
    // Return existing promise if request is in flight
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    // Create new promise
    const promise = fetchFn()
      .finally(() => {
        // Clean up after request completes
        this.pending.delete(key);
      });

    this.pending.set(key, promise);
    return promise;
  }

  /**
   * Clear all pending requests
   */
  clear() {
    this.pending.clear();
  }

  /**
   * Get number of pending requests
   * @returns {number} Number of pending requests
   */
  size() {
    return this.pending.size;
  }
}

export const requestDeduplicator = new RequestDeduplicator();

// Clean up expired cache entries periodically (every 5 minutes)
if (typeof window !== 'undefined') {
  setInterval(() => {
    directionsCache.clearExpired();
    apiResponseCache.clearExpired();
  }, 5 * 60 * 1000);
}

export default LRUCache;
