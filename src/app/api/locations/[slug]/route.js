import { NextResponse } from "next/server";
import { aggregateLocationsByProjectId } from "@/services/locationAggregationService";
import { getProjectBySlug } from "@/services/projectServices";

/**
 * Shared function to get locations for both GET and POST
 * Aggregates data from landmarks and nearby places APIs
 * Calculates distance/time using Mapbox Directions API
 */
async function getLocationsForSlug(slug, options = {}) {
  // Get project by slug to find projectId
  const project = await getProjectBySlug(slug);
  if (!project) {
    throw new Error(`Project with slug "${slug}" not found`);
  }

  // Aggregate locations from all sources (landmarks + nearby places)
  const locations = await aggregateLocationsByProjectId(project.id, {
    batchSize: options.batchSize || 10,
    profile: options.profile || "driving",
  });

  return locations;
}

/**
 * GET /api/locations/[slug]
 * Get aggregated locations for a project
 *
 * Fetches data from:
 * - /api/landmarks?projectId=...
 * - /api/nearby?projectId=...
 *
 * Calculates distance/time using Mapbox Directions API
 *
 * Query Parameters:
 * - projectId: Optional (will use slug if not provided)
 * - batchSize: Optional batch size (default: 10)
 * - profile: Optional Mapbox travel profile (default: "driving")
 *
 * Response: Array of location objects matching external API format
 */
export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);

    if (!slug) {
      return NextResponse.json(
        { error: "Project slug is required" },
        { status: 400 }
      );
    }

    const locations = await getLocationsForSlug(slug, {
      batchSize: parseInt(searchParams.get("batchSize") || "10"),
      profile: searchParams.get("profile") || "driving",
    });

    return NextResponse.json(locations, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Error in GET /api/locations/[slug]:", error);

    if (error.message?.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/locations/[slug]
 * Proxy/forward request directly to localhost:8000
 *
 * localhost:8000 will handle:
 * - Fetching data from localhost:3000 APIs (/api/landmarks, /api/nearby)
 * - Aggregating and processing the data
 * - Calculating distance/time using Mapbox
 *
 * Request Body: Forwarded as-is to localhost:8000
 *
 * Response: Response from localhost:8000 API
 */
export async function POST(request, { params }) {
  try {
    const { slug } = await params;
    const body = await request.json().catch(() => ({})); // Handle empty body

    if (!slug) {
      return NextResponse.json(
        { error: "Project slug is required" },
        { status: 400 }
      );
    }

    // Convert slug from hyphen to underscore (e.g., shalimar-evara -> shalimar_evara)
    const externalSlug = slug.replace(/-/g, "_");
    const externalApiUrl = `http://localhost:8000/api/locations/${externalSlug}`;

    console.log(`Proxying POST request to ${externalApiUrl}`);

    // Forward the request directly to localhost:8000
    const externalResponse = await fetch(externalApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!externalResponse.ok) {
      const errorText = await externalResponse.text();
      console.error(
        `Error from localhost:8000: ${externalResponse.status} - ${errorText}`
      );
      throw new Error(
        `External API error: ${externalResponse.status} - ${errorText}`
      );
    }

    const externalData = await externalResponse.json();

    return NextResponse.json(externalData, {
      status: externalResponse.status,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error in POST /api/locations/[slug]:", error);

    if (error.message?.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    // Check if it's a connection error to localhost:8000
    if (
      error.code === "ECONNREFUSED" ||
      error.message?.includes("fetch failed")
    ) {
      return NextResponse.json(
        {
          error:
            "Failed to connect to external API at localhost:8000. Make sure the server is running.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to proxy request to localhost:8000" },
      { status: 500 }
    );
  }
}
