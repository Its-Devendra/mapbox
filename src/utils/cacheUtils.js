/**
 * Cache Busting Utilities
 * Ensures images are never cached and always fresh
 */

/**
 * Bust cache for an image URL by appending a timestamp
 * @param {string} url - The image URL
 * @returns {string} - URL with cache-busting timestamp
 */
export function bustCache(url) {
    if (!url) return url;

    // Don't add timestamp if it's a data URL (base64)
    if (url.startsWith('data:')) return url;

    const timestamp = Date.now();
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${timestamp}`;
}

/**
 * Get a fresh version timestamp
 * @returns {number} - Current timestamp
 */
export function getFreshTimestamp() {
    return Date.now();
}
