import { NextResponse } from "next/server";
import { getLandmarksById, updateLandmark, deleteLandmark } from "@/services/landmarkService";
import { landmarkSchema } from "@/validations/landmarkSchema";

export async function GET(req, {params}) {
    const landmark = await getLandmarksById(params.id);
    if(!landmark) return NextResponse.json({ error: "Not Found"}, {status: 404});
    return NextResponse.json(landmark);
}

export async function PUT(req, {params}) {
    try{
        const body = await req.json();
        const parsed = landmarkSchema.partial().parse(body);
        const landmark = await updateLandmark(params.id, parsed);
        return NextResponse.json(landmark);
    } catch (err) {
        return NextResponse.json({ error: err.message}, {status: 400})
    }
}

export async function DELETE (req, {params}) {
    try{
        await deleteLandmark(params.id);
        return NextResponse.json({ message: "Deleted Successfully!"})
    } catch(err) {
        return NextResponse.json({error: err.message}, {status: 400})
    }
}