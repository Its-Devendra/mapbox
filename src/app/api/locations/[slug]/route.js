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
 * Aggregate data from localhost:3000 and POST to localhost:8000
 *
 * Steps:
 * 1. Fetch and aggregate data from localhost:3000 APIs (/api/landmarks, /api/nearby)
 * 2. Calculate distance/time using Mapbox Directions API
 * 3. POST the aggregated data to localhost:8000/api/locations/[slug]
 *
 * Request Body:
 * {
 *   projectId: "project-id-string" // Optional: will use slug if not provided
 *   batchSize: 10, // Optional: batch size for processing (default: 10)
 *   profile: "driving" // Optional: Mapbox travel profile (default: "driving")
 * }
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

    // Step 1: Get project info and aggregated locations from localhost:3000
    const project = await getProjectBySlug(slug);
    if (!project) {
      throw new Error(`Project with slug "${slug}" not found`);
    }

    console.log(`Aggregating locations for ${slug} from localhost:3000...`);
    const locations = await getLocationsForSlug(slug, {
      batchSize: body.batchSize || 10,
      profile: body.profile || "driving",
    });

    console.log(
      `Aggregated ${locations.length} locations, posting to localhost:8000...`
    );

    // Step 2: POST the aggregated data to localhost:8000
    // Try both slug formats (with hyphens and with underscores)
    const externalSlugUnderscore = slug.replace(/-/g, "_");
    const externalApiUrl = `http://localhost:8000/api/locations/${slug}`;
    const externalApiUrlAlt = `http://localhost:8000/api/locations/${externalSlugUnderscore}`;

    console.log(`POSTing ${locations.length} locations to localhost:8000...`);
    console.log(`Trying URL: ${externalApiUrl}`);
    console.log(`Alternative URL: ${externalApiUrlAlt}`);
    
    // Prepare request body - include project_id in case external API needs it
    const requestBody = {
      project_id: slug, // Include project_id in body
      locations: locations, // Array of locations
    };

    // POST the aggregated data to localhost:8000
    // Try with original slug first, then with underscore format
    let externalResponse;
    let lastError = null;

    // Try original slug format - try with locations array first
    try {
      externalResponse = await fetch(externalApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(locations), // Try direct array first
      });

      if (externalResponse.ok) {
        console.log(`✅ Successfully posted to ${externalApiUrl}`);
      } else {
        const errorText = await externalResponse.text();
        console.log(
          `⚠️  First attempt failed (${externalResponse.status}): ${errorText}`
        );
        lastError = { status: externalResponse.status, message: errorText };
      }
    } catch (fetchError) {
      console.log(`⚠️  First attempt error: ${fetchError.message}`);
      lastError = fetchError;
    }

    // If first attempt failed, try with underscore format
    if (!externalResponse || !externalResponse.ok) {
      console.log(
        `Trying alternative URL with underscore format: ${externalApiUrlAlt}`
      );
      try {
        // Try with underscore format - also try with request body format
        externalResponse = await fetch(externalApiUrlAlt, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(locations), // Try direct array
        });
        
        // If still fails, try with request body format
        if (!externalResponse.ok) {
          console.log(`Trying with request body format...`);
          const responseWithBody = await fetch(externalApiUrlAlt, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody), // Try with project_id wrapper
          });
          
          if (responseWithBody.ok) {
            externalResponse = responseWithBody;
            console.log(`✅ Success with request body format`);
          }
        }

        if (externalResponse.ok) {
          console.log(`✅ Successfully posted to ${externalApiUrlAlt}`);
        } else {
          const errorText = await externalResponse.text();
          console.log(
            `⚠️  Second attempt failed (${externalResponse.status}): ${errorText}`
          );
          lastError = { status: externalResponse.status, message: errorText };
        }
      } catch (fetchError) {
        console.log(`⚠️  Second attempt error: ${fetchError.message}`);
        lastError = fetchError;
      }
    }

    // Check if we got a successful response
    if (!externalResponse || !externalResponse.ok) {
      const errorMessage = lastError?.message || 
        (lastError?.status ? `Status ${lastError.status}: ${lastError.message}` : 'Unknown error');
      
      console.error(
        `Error from localhost:8000: ${errorMessage}`
      );
      
      // Return a more helpful error message
      return NextResponse.json(
        {
          error: `Failed to post to external API: ${errorMessage}`,
          details: {
            triedUrls: [externalApiUrl, externalApiUrlAlt],
            locationsCount: locations.length,
            suggestion: "Make sure the project exists in the external API or the API accepts creating new projects"
          }
        },
        { status: 502 } // Bad Gateway - external API issue
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
