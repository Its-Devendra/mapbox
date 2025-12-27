/**
 * Enterprise-Optimized Project Detail API
 * GET /api/projects/[id]
 * PUT /api/projects/[id]
 * DELETE /api/projects/[id]
 */

import { NextResponse } from "next/server";
import { getProjectById, updateProject, deleteProject } from "@/services/projectServices";
import { projectSchema } from "@/validations/projectSchema";

/**
 * GET /api/projects/[id]
 * Get project by ID with full details (cached)
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const project = await getProjectById(id);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Set cache headers
    const response = NextResponse.json(project);
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');

    return response;
  } catch (error) {
    console.error('Error in GET /api/projects/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]
 * Update project
 */
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate partial update
    const parsed = projectSchema.partial().parse(body);
    const project = await updateProject(id, parsed);

    // Return with no-cache headers to ensure fresh data
    const response = NextResponse.json(project);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('Error in PUT /api/projects/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update project' },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/projects/[id]
 * Delete project (cascades to related data)
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await deleteProject(id);

    return NextResponse.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/projects/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete project' },
      { status: 500 }
    );
  }
}