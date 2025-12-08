/**
 * Enterprise-Optimized Nearby Places Services
 * 
 * Features:
 * - Pagination for large datasets
 * - In-memory caching
 * - Optimized queries
 */

import { prisma } from "@/lib/prisma";
import { cache, cacheKeys, invalidateCache } from "@/lib/cache";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get paginated nearby places for a project
 * @param {string} projectId 
 * @param {object} options 
 * @returns {Promise<{places: NearBy[], total: number, page: number, hasMore: boolean}>}
 */
export async function getNearbyPlaces(projectId, options = {}) {
  const { page = 1, limit = 50 } = options;
  
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  const cacheKey = cacheKeys.nearby(projectId, page, limit);
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const [total, places] = await Promise.all([
    prisma.nearBy.count({ where: { projectId } }),
    prisma.nearBy.findMany({
      where: { projectId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { category: true },
    }),
  ]);

  const result = {
    places,
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };

  cache.set(cacheKey, result, CACHE_TTL);
  return result;
}

/**
 * Get all nearby places for map rendering (lightweight query)
 * @param {string} projectId 
 * @returns {Promise<NearBy[]>}
 */
export async function getNearbyPlacesForMap(projectId) {
  const cacheKey = `nearby:map:${projectId}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const places = await prisma.nearBy.findMany({
    where: { projectId },
    select: {
      id: true,
      title: true,
      latitude: true,
      longitude: true,
      icon: true,
      iconWidth: true,
      iconHeight: true,
      color: true,
      category: {
        select: {
          id: true,
          name: true,
          icon: true,
        },
      },
    },
  });

  cache.set(cacheKey, places, CACHE_TTL);
  return places;
}

/**
 * Get single nearby place by ID
 * @param {string} id 
 * @returns {Promise<NearBy|null>}
 */
export async function getNearbyPlaceById(id) {
  const cacheKey = `nearby:${id}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const place = await prisma.nearBy.findUnique({
    where: { id },
    include: { project: true, category: true },
  });

  if (place) {
    cache.set(cacheKey, place, CACHE_TTL);
  }

  return place;
}

/**
 * Create new nearby place
 * @param {object} data 
 * @returns {Promise<NearBy>}
 */
export async function createNearbyPlace(data) {
  const place = await prisma.nearBy.create({ data });
  
  // Invalidate cache
  invalidateCache.nearby(data.projectId);
  
  return place;
}

/**
 * Update nearby place
 * @param {string} id 
 * @param {object} data 
 * @returns {Promise<NearBy>}
 */
export async function updateNearbyPlace(id, data) {
  const place = await prisma.nearBy.update({
    where: { id },
    data,
    include: { category: true },
  });

  // Invalidate cache
  cache.delete(`nearby:${id}`);
  invalidateCache.nearby(place.projectId);

  return place;
}

/**
 * Delete nearby place
 * @param {string} id 
 * @returns {Promise<NearBy>}
 */
export async function deleteNearbyPlace(id) {
  const place = await prisma.nearBy.delete({ where: { id } });
  
  // Invalidate cache
  cache.delete(`nearby:${id}`);
  invalidateCache.nearby(place.projectId);

  return place;
}

/**
 * Bulk create nearby places
 * @param {string} projectId 
 * @param {Array} places 
 * @returns {Promise<{count: number}>}
 */
export async function bulkCreateNearbyPlaces(projectId, places) {
  const result = await prisma.nearBy.createMany({
    data: places.map(p => ({ ...p, projectId })),
    skipDuplicates: true,
  });

  invalidateCache.nearby(projectId);

  return result;
}
