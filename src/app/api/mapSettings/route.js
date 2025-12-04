import { NextResponse } from "next/server";
import { getMapSettings, createMapSetting } from "@/services/mapSettingService";
import { mapSettingSchema } from "@/validations/mapSettingSchema";

export async function GET() {
    try {
        const settings = await getMapSettings();
        return NextResponse.json(settings);
    } catch (error) {
        console.error('Error in GET /api/mapSettings:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch map settings' }, 
            { status: 500 }
        );
    }
}

export async function POST(req) {
    try{
        const body = await req.json();
        const parsed = mapSettingSchema.parse(body);
        const setting = await createMapSetting(parsed);
        return NextResponse.json(setting, {status: 201})
    } catch (err) {
        return NextResponse.json({ error: err.message}, {status: 400})
    }
}