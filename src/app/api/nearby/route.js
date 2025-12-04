import { NextResponse } from "next/server";
import { createNearbyPlace, getNearbyPlaces } from "@/services/nearbyService";
import { nearbySchema } from "@/validations/nearbySchema";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('projectId');

        const nearbyPlaces = await getNearbyPlaces(projectId);
        return NextResponse.json(nearbyPlaces);
    } catch (error) {
        console.error('Error in GET /api/nearby:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch nearby places' },
            { status: 500 }
        );
    }
}

export async function POST(req) {
    try{
        const body = await req.json();
        const parsed = nearbySchema.parse(body);
        const nearbyPlace = await createNearbyPlace(parsed);
        return NextResponse.json(nearbyPlace, {status: 201})
    } catch (err) {
        return NextResponse.json({ error: err.message}, {status: 400})
    }
}




