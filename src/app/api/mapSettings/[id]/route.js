import { NextResponse } from "next/server";
import { getMapSettingsById, updateMapSetting, deleteMapSetting } from "@/services/mapSettingService";
import { mapSettingSchema } from "@/validations/mapSettingSchema";

export async function GET(req, { params }) {
    const { id } = await params;
    const setting = await getMapSettingsById(id);
    if(!setting) return NextResponse.json({ error: "Not Found"}, {status: 404});
    return NextResponse.json(setting);
}

export async function PUT(req, { params }) {
    try{
        const { id } = await params;
        const body = await req.json();
        const parsed = mapSettingSchema.partial().parse(body);
        const setting = await updateMapSetting(id, parsed);
        return NextResponse.json(setting);
    } catch (err) {
        return NextResponse.json({ error: err.message}, {status: 400})
    }
}

export async function DELETE (req, { params }) {
    try{
        const { id } = await params;
        await deleteMapSetting(id);
        return NextResponse.json({ message: "Deleted Successfully!"})
    } catch(err) {
        return NextResponse.json({error: err.message}, {status: 400})
    }
}