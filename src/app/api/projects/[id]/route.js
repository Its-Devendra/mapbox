import { NextResponse } from "next/server";
import { getProjectById, updateProject, deleteProject } from "@/services/projectServices";
import { projectSchema } from "@/validations/projectSchema";

export async function GET(req, {params}) {
    try {
        const project = await getProjectById(params.id);
        if(!project) return NextResponse.json({error: "Not Found"}, {status: 404});
        return NextResponse.json(project);
    } catch (error) {
        console.error('Error in GET /api/projects/[id]:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch project' }, 
            { status: 500 }
        );
    }
}

export async function PUT(req, {params}) {
    try {
        const body = await req.json();
        const parsed = projectSchema.partial().parse(body);
        const project = await updateProject(params.id, parsed);
        return NextResponse.json(project);
    } catch (err) {
        return NextResponse.json({ error: err.message}, {status: 400});
    }
}

export async function DELETE (req, {params}) {
    try {
        await deleteProject(params.id);
        return NextResponse.json({ message: "Deleted Successfully!"});

    } catch(err) {
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}