import { NextResponse } from "next/server";
import { getNearbyPlaceById, updateNearbyPlace, deleteNearbyPlace } from "@/services/nearbyService";
import { nearbySchema } from "@/validations/nearbySchema";

export async function GET(req, {params}) {
    const nearbyPlace = await getNearbyPlaceById(params.id);
    if(!nearbyPlace) return NextResponse.json({ error: "Not Found"}, {status: 404});
    return NextResponse.json(nearbyPlace);
}

export async function PUT(req, {params}) {
    try{
        const body = await req.json();
        const parsed = nearbySchema.partial().parse(body);
        const nearbyPlace = await updateNearbyPlace(params.id, parsed);
        return NextResponse.json(nearbyPlace);
    } catch (err) {
        return NextResponse.json({ error: err.message}, {status: 400})
    }
}

export async function DELETE (req, {params}) {
    try{
        await deleteNearbyPlace(params.id);
        return NextResponse.json({ message: "Deleted Successfully!"})
    } catch(err) {
        return NextResponse.json({error: err.message}, {status: 400})
    }
}




