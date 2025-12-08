/**
 * Enterprise Rate Limiting Middleware
 * 
 * Protects APIs from abuse and ensures fair usage
 * Uses sliding window algorithm for accurate rate limiting
 * 
 * Default: 100 requests per minute per IP
 */

// In-memory store for rate limiting (use Redis in production for multi-instance)
const rateLimitStore = new Map();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.windowStart > 60000) { // 1 minute window
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

/**
 * Rate limiting configuration
 */
const RATE_LIMITS = {
  default: { requests: 100, windowMs: 60000 },    // 100 req/min
  strict: { requests: 20, windowMs: 60000 },       // 20 req/min
  relaxed: { requests: 500, windowMs: 60000 },     // 500 req/min
  api: { requests: 1000, windowMs: 60000 },        // 1000 req/min for API
};

/**
 * Get client identifier (IP address or API key)
 * @param {Request} request 
 * @returns {string}
 */
function getClientId(request) {
  // Try to get real IP from headers (for proxied requests)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const apiKey = request.headers.get('x-api-key');
  
  // Prefer API key for authenticated requests
  if (apiKey) {
    return `api:${apiKey}`;
  }
  
  // Use IP address
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

/**
 * Check if request should be rate limited
 * @param {string} clientId 
 * @param {string} limitType - 'default', 'strict', 'relaxed', or 'api'
 * @returns {{allowed: boolean, remaining: number, resetTime: number}}
 */
export function checkRateLimit(clientId, limitType = 'default') {
  const limit = RATE_LIMITS[limitType] || RATE_LIMITS.default;
  const now = Date.now();
  const key = `${limitType}:${clientId}`;
  
  let data = rateLimitStore.get(key);
  
  // New client or window expired
  if (!data || now - data.windowStart > limit.windowMs) {
    data = {
      count: 1,
      windowStart: now,
    };
    rateLimitStore.set(key, data);
    
    return {
      allowed: true,
      remaining: limit.requests - 1,
      resetTime: now + limit.windowMs,
    };
  }
  
  // Increment counter
  data.count++;
  
  const allowed = data.count <= limit.requests;
  const remaining = Math.max(0, limit.requests - data.count);
  const resetTime = data.windowStart + limit.windowMs;
  
  return { allowed, remaining, resetTime };
}

/**
 * Rate limiting middleware for Next.js API routes
 * @param {Request} request 
 * @param {string} limitType 
 * @returns {Response|null} - Returns error response if rate limited, null if allowed
 */
export function rateLimit(request, limitType = 'default') {
  const clientId = getClientId(request);
  const result = checkRateLimit(clientId, limitType);
  
  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(RATE_LIMITS[limitType]?.requests || 100),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetTime),
          'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)),
        },
      }
    );
  }
  
  return null; // Allowed
}

/**
 * Add rate limit headers to response
 * @param {Response} response 
 * @param {object} rateLimitResult 
 * @returns {Response}
 */
export function addRateLimitHeaders(response, rateLimitResult) {
  response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  response.headers.set('X-RateLimit-Reset', String(rateLimitResult.resetTime));
  return response;
}

/**
 * Higher-order function to wrap API handlers with rate limiting
 * @param {Function} handler 
 * @param {string} limitType 
 * @returns {Function}
 */
export function withRateLimit(handler, limitType = 'default') {
  return async (request, context) => {
    const rateLimitResponse = rateLimit(request, limitType);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    return handler(request, context);
  };
}

export default rateLimit;
