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
 * Fetches data from database:
 * - Landmarks for the project
 * - Nearby places for the project
 *
 * Calculates distance/time using Mapbox Directions API
 *
 * Query Parameters:
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
 * Aggregate data and POST directly to external API
 *
 * Steps:
 * 1. Fetch and aggregate data from database (landmarks + nearby places)
 * 2. Calculate distance/time using Mapbox Directions API
 * 3. POST the aggregated data directly to https://api.floorselector.convrse.ai/api/locations/[slug]/bulk
 *
 * Request Body:
 * {
 *   batchSize: 10, // Optional: batch size for processing (default: 10)
 *   profile: "driving" // Optional: Mapbox travel profile (default: "driving")
 * }
 *
 * Response: Response from external API
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

    // Get project info and aggregate locations from database
    const project = await getProjectBySlug(slug);
    if (!project) {
      throw new Error(`Project with slug "${slug}" not found`);
    }

    console.log(`Aggregating locations for ${slug}...`);
    const locations = await getLocationsForSlug(slug, {
      batchSize: body.batchSize || 10,
      profile: body.profile || "driving",
    });

    console.log(
      `Aggregated ${locations.length} locations, posting to external API...`
    );

    // POST the aggregated data directly to external API using bulk endpoint
    const externalApiUrl = `https://api.floorselector.convrse.ai/api/locations/${slug}/bulk`;

    console.log(
      `POSTing ${locations.length} locations to ${externalApiUrl}...`
    );

    const M3M_AUTH_TOKEN =
      process.env.M3M_AUTH_TOKEN || "X9k#2mP$vL7nQ!wZ3tR&8jF@h4Z%yP32qX7vS";

    const externalResponse = await fetch(externalApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${M3M_AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        locations: locations,
      }),
    });

    if (!externalResponse.ok) {
      let errorMessage;
      const contentType = externalResponse.headers.get("content-type");

      try {
        if (contentType?.includes("application/json")) {
          const errorData = await externalResponse.json();
          errorMessage =
            errorData.msg ||
            errorData.message ||
            errorData.error ||
            JSON.stringify(errorData);
        } else {
          errorMessage = await externalResponse.text();
        }
      } catch (parseError) {
        errorMessage = `HTTP ${externalResponse.status} ${externalResponse.statusText}`;
      }

      console.error(
        `Error from external API (${externalResponse.status}): ${errorMessage}`
      );

      return NextResponse.json(
        {
          error: `Failed to post to external API: ${errorMessage}`,
          details: {
            url: externalApiUrl,
            status: externalResponse.status,
            locationsCount: locations.length,
            suggestion:
              "Make sure the project exists in the external API or the API accepts creating new projects",
          },
        },
        { status: externalResponse.status || 502 }
      );
    }

    const externalData = await externalResponse.json();

    console.log(
      `✅ Successfully posted ${locations.length} locations to ${externalApiUrl}`
    );

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

    // Check if it's a connection error to external API
    if (
      error.code === "ECONNREFUSED" ||
      error.message?.includes("fetch failed")
    ) {
      return NextResponse.json(
        {
          error:
            "Failed to connect to external API. Please check your network connection.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to post data to external API" },
      { status: 500 }
    );
  }
}
