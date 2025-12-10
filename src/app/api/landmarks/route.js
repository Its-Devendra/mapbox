import { NextResponse } from "next/server";
import { createLandmark, getLandmarks } from "@/services/landmarkService";
import { landmarkSchema } from "@/validations/landmarkSchema";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('projectId');

        // Return empty array if no projectId provided
        if (!projectId) {
            return NextResponse.json([]);
        }

        const result = await getLandmarks(projectId);
        // getLandmarks returns { landmarks, total, page, hasMore } - extract just the array
        return NextResponse.json(result.landmarks || []);
    } catch (error) {
        console.error('Error in GET /api/landmarks:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch landmarks' },
            { status: 500 }
        );
    }
}

export async function POST(req) {
    try{
        const body = await req.json();
        const parsed = landmarkSchema.parse(body);
        const landmark = await createLandmark(parsed);
        return NextResponse.json(landmark, {status: 201})
    } catch (err) {
        return NextResponse.json({ error: err.message}, {status: 400})
    }
}