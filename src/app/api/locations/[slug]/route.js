import { NextResponse } from "next/server";
import { aggregateLocationsByProjectId } from "@/services/locationAggregationService";
import { getProjectBySlug } from "@/services/projectServices";

/**
 * POST /api/locations/[slug]
 * Aggregate locations from multiple APIs and calculate distance/time using Mapbox
 * 
 * Request Body:
 * {
 *   projectId: "project-id-string" // Optional: if not provided, will use slug to find project
 *   batchSize: 10, // Optional: batch size for processing (default: 10)
 *   profile: "driving" // Optional: Mapbox travel profile (default: "driving")
 * }
 * 
 * Response:
 * Array of location objects matching external API format:
 * [
 *   {
 *     _id: "location-id",
 *     project_id: "slug",
 *     name: "Location Name",
 *     category: "hotel",
 *     latitude: 28.49,
 *     longitude: 77.08,
 *     distance: 5.5,  // km (calculated from Mapbox)
 *     time: 12,       // minutes (calculated from Mapbox)
 *     is_active: true,
 *     __v: 0,
 *     createdAt: "2025-01-01T00:00:00.000Z",
 *     updatedAt: "2025-01-01T00:00:00.000Z"
 *   }
 * ]
 */
export async function POST(request, { params }) {
  try {
    const { slug } = await params;
    const body = await request.json().catch(() => ({})); // Handle empty body

    if (!slug) {
      return NextResponse.json(
        { error: 'Project slug is required' },
        { status: 400 }
      );
    }

    let projectId = body.projectId;

    // If projectId not provided, get it from slug
    if (!projectId) {
      const project = await getProjectBySlug(slug);
      if (!project) {
        return NextResponse.json(
          { error: `Project with slug "${slug}" not found` },
          { status: 404 }
        );
      }
      projectId = project.id;
    }

    // Aggregate locations from all sources
    const locations = await aggregateLocationsByProjectId(projectId, {
      batchSize: body.batchSize || 10,
      profile: body.profile || 'driving',
    });

    return NextResponse.json(locations, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate', // Don't cache POST responses
      },
    });
  } catch (error) {
    console.error('Error in POST /api/locations/[slug]:', error);
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to aggregate locations' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/locations/[slug]
 * Get locations for a project (alternative to POST)
 * 
 * Query Parameters:
 * - projectId: Optional project ID (if not provided, will use slug)
 * - batchSize: Optional batch size (default: 10)
 * - profile: Optional Mapbox travel profile (default: "driving")
 */
export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    
    // Get projectId from query param or fetch by slug
    let projectId = searchParams.get('projectId');
    
    if (!projectId) {
      const project = await getProjectBySlug(slug);
      if (!project) {
        return NextResponse.json(
          { error: `Project with slug "${slug}" not found` },
          { status: 404 }
        );
      }
      projectId = project.id;
    }

    const locations = await aggregateLocationsByProjectId(projectId, {
      batchSize: parseInt(searchParams.get('batchSize') || '10'),
      profile: searchParams.get('profile') || 'driving',
    });

    return NextResponse.json(locations, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/locations/[slug]:', error);
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

