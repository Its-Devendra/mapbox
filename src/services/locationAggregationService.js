/**
 * Centralized Location Aggregation Service
 * Aggregates data from multiple APIs and calculates distance/time using Mapbox
 */

import { getProjectById } from "@/services/projectServices";
import { getLandmarks } from "@/services/landmarkService";
import { getNearbyPlaces } from "@/services/nearbyService";
import { getMapboxDistanceAndTime, metersToKm, secondsToMinutes } from "@/utils/mapboxDirectionsServer";

/**
 * Transform landmark to external API format
 * @param {Object} landmark - Landmark object
 * @param {string} projectSlug - Project slug
 * @param {Object} distanceTime - { distance: number (km), time: number (minutes) }
 * @returns {Object} Transformed location
 */
function transformLandmark(landmark, projectSlug, distanceTime) {
  const categoryName = landmark.category?.name || 'landmark';
  
  return {
    _id: landmark.id,
    project_id: projectSlug,
    name: landmark.title,
    category: categoryName.toLowerCase(),
    latitude: landmark.latitude,
    longitude: landmark.longitude,
    distance: distanceTime.distance,
    time: distanceTime.time,
    is_active: true,
    __v: 0,
    createdAt: landmark.createdAt.toISOString(),
    updatedAt: landmark.updatedAt.toISOString(),
  };
}

/**
 * Transform nearby place to external API format
 * @param {Object} place - Nearby place object
 * @param {string} projectSlug - Project slug
 * @param {Object} distanceTime - { distance: number (km), time: number (minutes) }
 * @returns {Object} Transformed location
 */
function transformNearbyPlace(place, projectSlug, distanceTime) {
  const categoryName = place.category?.name || 'nearby';
  
  return {
    _id: place.id,
    project_id: projectSlug,
    name: place.title,
    category: categoryName.toLowerCase(),
    latitude: place.latitude,
    longitude: place.longitude,
    distance: distanceTime.distance,
    time: distanceTime.time,
    is_active: true,
    __v: 0,
    createdAt: place.createdAt.toISOString(),
    updatedAt: place.updatedAt.toISOString(),
  };
}

/**
 * Calculate distance and time for a location using Mapbox Directions API
 * @param {Object} clientBuilding - { lat: number, lng: number }
 * @param {Object} location - { latitude: number, longitude: number }
 * @param {string} profile - Travel profile
 * @returns {Promise<Object>} { distance: number (km), time: number (minutes) }
 */
async function calculateDistanceAndTime(clientBuilding, location, profile = 'driving') {
  if (!clientBuilding?.lat || !clientBuilding?.lng) {
    return { distance: null, time: null };
  }

  // Convert to [lng, lat] format for Mapbox
  const start = [clientBuilding.lng, clientBuilding.lat];
  const end = [location.longitude, location.latitude];

  // Get distance and time from Mapbox
  const result = await getMapboxDistanceAndTime(start, end, profile);

  if (result.error) {
    console.warn(`Failed to get directions for location ${location.id || location.title}:`, result.error);
    return { distance: null, time: null };
  }

  return {
    distance: metersToKm(result.distance),
    time: secondsToMinutes(result.duration)
  };
}

/**
 * Aggregate all locations for a project
 * Fetches data from multiple APIs and calculates distance/time
 * 
 * @param {string} projectId - Project ID
 * @param {Object} options - Options
 * @returns {Promise<Array>} Array of location objects in external API format
 */
export async function aggregateLocationsByProjectId(projectId, options = {}) {
  const {
    batchSize = 10, // Process locations in batches to avoid rate limits
    profile = 'driving', // Mapbox travel profile
  } = options;

  // 1. Get project by ID to extract slug and client building
  const project = await getProjectById(projectId);
  if (!project) {
    throw new Error(`Project with ID "${projectId}" not found`);
  }

  const projectSlug = project.slug;
  const clientBuilding = project.clientBuildingLat && project.clientBuildingLng
    ? {
        lat: project.clientBuildingLat,
        lng: project.clientBuildingLng,
      }
    : null;

  // 2. Fetch landmarks and nearby places in parallel
  const [landmarksResult, nearbyResult] = await Promise.all([
    getLandmarks(projectId),
    getNearbyPlaces(projectId),
  ]);

  const landmarks = landmarksResult.landmarks || [];
  const nearbyPlaces = nearbyResult.places || [];

  console.log(`Processing ${landmarks.length} landmarks and ${nearbyPlaces.length} nearby places...`);

  // 3. Process landmarks with distance/time calculation
  const processedLandmarks = await Promise.all(
    landmarks.map(async (landmark, index) => {
      // Add small delay between requests to avoid rate limits
      if (index > 0 && index % batchSize === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const distanceTime = clientBuilding
        ? await calculateDistanceAndTime(clientBuilding, landmark, profile)
        : { distance: null, time: null };
      
      return transformLandmark(landmark, projectSlug, distanceTime);
    })
  );

  // 4. Process nearby places with distance/time calculation
  const processedNearby = await Promise.all(
    nearbyPlaces.map(async (place, index) => {
      // Add small delay between requests to avoid rate limits
      if (index > 0 && index % batchSize === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const distanceTime = clientBuilding
        ? await calculateDistanceAndTime(clientBuilding, place, profile)
        : { distance: null, time: null };
      
      return transformNearbyPlace(place, projectSlug, distanceTime);
    })
  );

  // 5. Combine and sort by distance (closest first)
  const allLocations = [...processedLandmarks, ...processedNearby];
  
  allLocations.sort((a, b) => {
    if (a.distance === null && b.distance === null) return 0;
    if (a.distance === null) return 1;
    if (b.distance === null) return -1;
    return a.distance - b.distance;
  });

  console.log(`Successfully processed ${allLocations.length} locations`);

  return allLocations;
}

