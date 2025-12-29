/**
 * Script to aggregate locations from database and send directly to external API
 * Bypasses localhost:3000 API route completely
 * 
 * Usage: node scripts/send-locations-direct.js [slug] [options]
 * Example: node scripts/send-locations-direct.js shalimar-evara
 * 
 * Options via environment variables:
 * - BATCH_SIZE: Batch size for processing (default: 10)
 * - PROFILE: Mapbox travel profile (default: driving)
 */

const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

const EXTERNAL_API_BASE = process.env.EXTERNAL_API_BASE || "https://api.floorselector.convrse.ai";
const M3M_AUTH_TOKEN = process.env.M3M_AUTH_TOKEN ||
  "X9k#2mP$vL7nQ!wZ3tR&8jF@h4Z%yP32qX7vS";
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 
  "pk.eyJ1IjoiZGV2Yml0czA5IiwiYSI6ImNtYzkyZTR2dDE0MDAyaXMzdXRndjJ0M2EifQ.Jhhx-1tf_NzrZNfGX8wp_w";

/**
 * Get distance and duration using Mapbox Directions API
 */
async function getMapboxDistanceAndTime(start, end, profile = 'driving') {
  try {
    if (!start || !end || start.length !== 2 || end.length !== 2) {
      return { distance: null, duration: null, error: 'Invalid coordinates' };
    }

    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${start[0]},${start[1]};${end[0]},${end[1]}`;
    const params = new URLSearchParams({
      geometries: 'geojson',
      access_token: MAPBOX_TOKEN
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

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
        distance: route.distance,
        duration: route.duration,
        error: null
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    return {
      distance: null,
      duration: null,
      error: error.message || 'Failed to get directions'
    };
  }
}

function metersToKm(meters) {
  if (!meters || isNaN(meters)) return null;
  return Math.round((meters / 1000) * 10) / 10;
}

function secondsToMinutes(seconds) {
  if (!seconds || isNaN(seconds)) return null;
  return Math.round(seconds / 60);
}

/**
 * Calculate distance and time for a location
 */
async function calculateDistanceAndTime(clientBuilding, location, profile = 'driving') {
  if (!clientBuilding?.lat || !clientBuilding?.lng) {
    return { distance: null, time: null };
  }

  const start = [clientBuilding.lng, clientBuilding.lat];
  const end = [location.longitude, location.latitude];

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
 * Transform landmark to external API format
 */
function transformLandmark(landmark, projectSlug, distanceTime) {
  const categoryName = landmark.category?.name || 'landmark';
  
  return {
    project_id: projectSlug,
    name: landmark.title,
    category: categoryName.toLowerCase(),
    latitude: landmark.latitude,
    longitude: landmark.longitude,
    distance: distanceTime.distance,
    time: distanceTime.time,
    is_active: true,
  };
}

/**
 * Transform nearby place to external API format
 */
function transformNearbyPlace(place, projectSlug, distanceTime) {
  const categoryName = place.category?.name || 'nearby';
  
  return {
    project_id: projectSlug,
    name: place.title,
    category: categoryName.toLowerCase(),
    latitude: place.latitude,
    longitude: place.longitude,
    distance: distanceTime.distance,
    time: distanceTime.time,
    is_active: true,
  };
}

/**
 * Aggregate all locations for a project
 */
async function aggregateLocations(slug, options = {}) {
  const {
    batchSize = parseInt(process.env.BATCH_SIZE) || 10,
    profile = process.env.PROFILE || 'driving',
  } = options;

  // Get project by slug
  const project = await prisma.project.findUnique({
    where: { slug },
    include: {
      landmarks: {
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      },
      nearByPlaces: {
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!project) {
    throw new Error(`Project with slug "${slug}" not found`);
  }

  const clientBuilding = project.clientBuildingLat && project.clientBuildingLng
    ? {
        lat: project.clientBuildingLat,
        lng: project.clientBuildingLng,
      }
    : null;

  const landmarks = project.landmarks || [];
  const nearbyPlaces = project.nearByPlaces || [];

  console.log(`Processing ${landmarks.length} landmarks and ${nearbyPlaces.length} nearby places...`);

  // Process landmarks
  const processedLandmarks = await Promise.all(
    landmarks.map(async (landmark, index) => {
      if (index > 0 && index % batchSize === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const distanceTime = clientBuilding
        ? await calculateDistanceAndTime(clientBuilding, landmark, profile)
        : { distance: null, time: null };
      
      return transformLandmark(landmark, slug, distanceTime);
    })
  );

  // Process nearby places
  const processedNearby = await Promise.all(
    nearbyPlaces.map(async (place, index) => {
      if (index > 0 && index % batchSize === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const distanceTime = clientBuilding
        ? await calculateDistanceAndTime(clientBuilding, place, profile)
        : { distance: null, time: null };
      
      return transformNearbyPlace(place, slug, distanceTime);
    })
  );

  // Combine and sort by distance
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

/**
 * Send locations directly to external API
 */
async function sendToExternalAPI(slug, locations) {
  const externalApiUrl = `${EXTERNAL_API_BASE}/api/locations/${slug}/bulk`;

  console.log(`\n📤 Sending ${locations.length} locations to ${externalApiUrl}...`);
  
  // Log first location as sample for debugging
  if (locations.length > 0) {
    console.log(`\n📋 Sample location data (first item):`);
    console.log(JSON.stringify(locations[0], null, 2));
  }

  const response = await fetch(externalApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${M3M_AUTH_TOKEN}`,
    },
    body: JSON.stringify({
      locations: locations,
    }),
  });

  if (!response.ok) {
    let errorMessage;
    const contentType = response.headers.get("content-type");
    
    try {
      if (contentType?.includes("application/json")) {
        const errorData = await response.json();
        errorMessage = errorData.msg || errorData.message || errorData.error || JSON.stringify(errorData);
      } else {
        errorMessage = await response.text();
      }
    } catch (parseError) {
      errorMessage = `HTTP ${response.status} ${response.statusText}`;
    }

    throw new Error(`External API error (${response.status}): ${errorMessage}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Main function
 */
async function main() {
  const slug = process.argv[2] || process.env.SLUG || 'shalimar-evara';

  console.log("=".repeat(60));
  console.log("  Direct Location Sender");
  console.log("=".repeat(60));
  console.log(`Project Slug: ${slug}`);
  console.log(`External API: ${EXTERNAL_API_BASE}`);
  console.log("=".repeat(60));

  try {
    // Step 1: Aggregate locations from database
    console.log(`\n📊 Step 1: Aggregating locations from database...`);
    const locations = await aggregateLocations(slug);

    console.log(`\n✅ Aggregated ${locations.length} locations:`);
    const byCategory = {};
    locations.forEach((loc) => {
      const cat = loc.category || "unknown";
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });
    Object.entries(byCategory).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}`);
    });

    // Step 2: Send directly to external API
    console.log(`\n📤 Step 2: Sending to external API...`);
    const result = await sendToExternalAPI(slug, locations);

    console.log(`\n✅ Success! Response from external API:`);
    if (Array.isArray(result)) {
      console.log(`   Received ${result.length} locations`);
    } else {
      console.log(`   Response:`, JSON.stringify(result, null, 2));
    }

    console.log("\n" + "=".repeat(60));
    console.log("  ✨ Done!");
    console.log("=".repeat(60) + "\n");

  } catch (error) {
    console.error("\n❌ Error:");
    console.error(error.message);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

