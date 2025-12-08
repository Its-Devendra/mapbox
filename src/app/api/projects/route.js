/**
 * Enterprise-Optimized Projects API
 * 
 * Features:
 * - Pagination (default 20 items per page)
 * - Query parameters: page, limit, includeRelations
 * - Cached responses
 * - Handles 1000+ concurrent requests
 */

import { NextResponse } from "next/server";
import { getProjects, createProject, getProjectStats } from "@/services/projectServices";
import { projectSchema } from "@/validations/projectSchema";

/**
 * GET /api/projects
 * 
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - includeRelations: boolean (default: false)
 * - isActive: boolean (optional filter)
 * 
 * Response:
 * {
 *   projects: [...],
 *   total: number,
 *   page: number,
 *   limit: number,
 *   hasMore: boolean,
 *   totalPages: number
 * }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const includeRelations = searchParams.get('includeRelations') === 'true';
    const isActiveParam = searchParams.get('isActive');
    const isActive = isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined;

    const result = await getProjects({
      page,
      limit,
      includeRelations,
      isActive,
    });

    // Set cache headers for CDN caching
    const response = NextResponse.json(result);
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
    
    return response;
  } catch (error) {
    console.error('Error in GET /api/projects:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Create a new project
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = projectSchema.parse(body);
    const project = await createProject(parsed);
    
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/projects:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create project' },
      { status: 400 }
    );
  }
}