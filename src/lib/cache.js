/**
 * Enterprise In-Memory Cache for High Performance
 * Reduces database load by caching frequently accessed data
 * 
 * Features:
 * - TTL (Time To Live) based expiration
 * - LRU (Least Recently Used) eviction when max size reached
 * - Automatic cache invalidation helpers
 */

class MemoryCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 1000; // Max cached items
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Get item from cache
   * @param {string} key 
   * @returns {any|null}
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update access time for LRU
    item.lastAccessed = Date.now();
    return item.value;
  }

  /**
   * Set item in cache
   * @param {string} key 
   * @param {any} value 
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = this.defaultTTL) {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      lastAccessed: Date.now(),
    });
  }

  /**
   * Delete item from cache
   * @param {string} key 
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Invalidate all items matching a pattern
   * @param {string} pattern - Prefix to match
   */
  invalidatePattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Evict least recently used item
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Get cache statistics
   */
  stats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// Global cache instance
const cache = new MemoryCache({
  maxSize: 2000,          // Cache up to 2000 items
  defaultTTL: 5 * 60 * 1000, // 5 minutes default TTL
});

// Cache key generators for consistency
export const cacheKeys = {
  projects: (page, limit) => `projects:list:${page}:${limit}`,
  project: (id) => `projects:${id}`,
  projectBySlug: (slug) => `projects:slug:${slug}`,
  themes: (projectId) => `themes:project:${projectId}`,
  activeTheme: (projectId) => `themes:active:${projectId}`,
  landmarks: (projectId, page, limit) => `landmarks:${projectId}:${page}:${limit}`,
  categories: (projectId) => `categories:${projectId}`,
  nearby: (projectId, page, limit) => `nearby:${projectId}:${page}:${limit}`,
  settings: (projectId) => `settings:${projectId}`,
};

// Cache invalidation helpers
export const invalidateCache = {
  project: (id) => {
    cache.delete(cacheKeys.project(id));
    cache.invalidatePattern('projects:list');
  },
  themes: (projectId) => {
    cache.invalidatePattern(`themes:${projectId}`);
    cache.delete(cacheKeys.activeTheme(projectId));
  },
  landmarks: (projectId) => {
    cache.invalidatePattern(`landmarks:${projectId}`);
  },
  categories: (projectId) => {
    cache.delete(cacheKeys.categories(projectId));
  },
  nearby: (projectId) => {
    cache.invalidatePattern(`nearby:${projectId}`);
  },
  settings: (projectId) => {
    cache.delete(cacheKeys.settings(projectId));
  },
  all: () => {
    cache.clear();
  },
};

export { cache };
export default cache;
