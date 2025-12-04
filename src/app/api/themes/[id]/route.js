import { NextResponse } from "next/server";
import { getThemeById, updateTheme, deleteTheme } from "@/services/themeService";
import { themeSchema } from "@/validations/themeSchema";

export async function GET(req, {params}) {
    const theme = await getThemeById(params.id);
    if(!theme) return NextResponse.json({error: "Not Found"}, {status: 404})
    return NextResponse.json(theme);
}

export async function PUT(req, {params}) {
    try{
        const body = await req.json();
        const parsed = themeSchema.partial().parse(body);
        const theme = await updateTheme(params.id, parsed);
        return NextResponse.json(theme);
    } catch (err) {
        return NextResponse.json({ error: err.message}, {status: 400})
    }
}

export async function DELETE (req, {params}) {
    try {
        await deleteTheme(params.id);
        return NextResponse.json({ message: " Deleted Successfully!"});
    } catch(err) {
        return NextResponse.json({ error: err.message}, {status: 400})
    }
}