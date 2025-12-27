/**
 * Enterprise-Optimized Landmark Services
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
 * Get paginated landmarks for a project
 * @param {string} projectId 
 * @param {object} options 
 * @returns {Promise<{landmarks: Landmark[], total: number, page: number, hasMore: boolean}>}
 */
export async function getLandmarks(projectId, options = {}) {
  const { page = 1, limit = 50 } = options;
  
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  const cacheKey = cacheKeys.landmarks(projectId, page, limit);
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const [total, landmarks] = await Promise.all([
    prisma.landmark.count({ where: { projectId } }),
    prisma.landmark.findMany({
      where: { projectId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { category: true },
    }),
  ]);

  const result = {
    landmarks,
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };

  cache.set(cacheKey, result, CACHE_TTL);
  return result;
}

/**
 * Get all landmarks for a project (for map rendering)
 * Uses lighter query without full relations
 * @param {string} projectId 
 * @returns {Promise<Landmark[]>}
 */
export async function getLandmarksForMap(projectId) {
  const cacheKey = `landmarks:map:${projectId}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const landmarks = await prisma.landmark.findMany({
    where: { projectId },
    select: {
      id: true,
      title: true,
      description: true,
      latitude: true,
      longitude: true,
      icon: true,
      iconWidth: true,
      iconHeight: true,
      category: {
        select: {
          id: true,
          name: true,
          icon: true,
          defaultIconWidth: true,
          defaultIconHeight: true,
          useCategoryDefaults: true,
        },
      },
    },
  });

  cache.set(cacheKey, landmarks, CACHE_TTL);
  return landmarks;
}

/**
 * Get single landmark by ID
 * @param {string} id 
 * @returns {Promise<Landmark|null>}
 */
export async function getLandmarksById(id) {
  const cacheKey = `landmark:${id}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const landmark = await prisma.landmark.findUnique({
    where: { id },
    include: { project: true, category: true },
  });

  if (landmark) {
    cache.set(cacheKey, landmark, CACHE_TTL);
  }

  return landmark;
}

/**
 * Create new landmark
 * @param {object} data 
 * @returns {Promise<Landmark>}
 */
export async function createLandmark(data) {
  const landmark = await prisma.landmark.create({ data });
  
  // Invalidate cache
  invalidateCache.landmarks(data.projectId);
  
  return landmark;
}

/**
 * Update landmark
 * @param {string} id 
 * @param {object} data 
 * @returns {Promise<Landmark>}
 */
export async function updateLandmark(id, data) {
  const landmark = await prisma.landmark.update({
    where: { id },
    data,
    include: { category: true },
  });

  // Invalidate cache
  cache.delete(`landmark:${id}`);
  invalidateCache.landmarks(landmark.projectId);

  return landmark;
}

/**
 * Delete landmark
 * @param {string} id 
 * @returns {Promise<Landmark>}
 */
export async function deleteLandmark(id) {
  const landmark = await prisma.landmark.delete({ where: { id } });
  
  // Invalidate cache
  cache.delete(`landmark:${id}`);
  invalidateCache.landmarks(landmark.projectId);

  return landmark;
}

/**
 * Bulk create landmarks (for imports)
 * @param {Array} landmarks 
 * @returns {Promise<{count: number}>}
 */
export async function bulkCreateLandmarks(projectId, landmarks) {
  const result = await prisma.landmark.createMany({
    data: landmarks.map(l => ({ ...l, projectId })),
    skipDuplicates: true,
  });

  invalidateCache.landmarks(projectId);

  return result;
}