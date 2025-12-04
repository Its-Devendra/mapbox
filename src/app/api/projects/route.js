import { NextResponse } from "next/server";
import { createProject, getProjects } from "@/services/projectServices";
import { projectSchema } from "@/validations/projectSchema";

export async function GET() {
    try {
        const projects = await getProjects();
        return NextResponse.json(projects);
    } catch (error) {
        console.error('Error in GET /api/projects:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch projects' }, 
            { status: 500 }
        );
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const parsed = projectSchema.parse(body);
        const project = await createProject(parsed);
        return NextResponse.json(project, {status: 201});
    } catch (error) {
        return NextResponse.json({error: error.message}, {status: 400});
    }
}