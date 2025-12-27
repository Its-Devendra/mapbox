import { NextResponse } from "next/server";
import { getThemeById, updateTheme, deleteTheme } from "@/services/themeService";
import { themeSchema } from "@/validations/themeSchema";

export async function GET(req, {params}) {
    const { id } = await params;
    const theme = await getThemeById(id);
    if(!theme) return NextResponse.json({error: "Not Found"}, {status: 404})
    return NextResponse.json(theme);
}

export async function PUT(req, {params}) {
    try{
        const { id } = await params;
        const body = await req.json();
        const parsed = themeSchema.partial().parse(body);
        const theme = await updateTheme(id, parsed);
        return NextResponse.json(theme);
    } catch (err) {
        return NextResponse.json({ error: err.message}, {status: 400})
    }
}

export async function DELETE (req, {params}) {
    try {
        const { id } = await params;
        await deleteTheme(id);
        return NextResponse.json({ message: " Deleted Successfully!"});
    } catch(err) {
        return NextResponse.json({ error: err.message}, {status: 400})
    }
}