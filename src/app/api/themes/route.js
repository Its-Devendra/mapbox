import { NextResponse } from "next/server";
import { getThemes, createTheme } from "@/services/themeService";
import { themeSchema } from "@/validations/themeSchema";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('projectId');

        const themes = await getThemes(projectId);
        return NextResponse.json(themes);
    } catch (error) {
        console.error('Error in GET /api/themes:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch themes' },
            { status: 500 }
        );
    }
}

export async function POST(req) {
    try{
        const body = await req.json();
        const parsed = themeSchema.parse(body);
        const theme = await createTheme(parsed);
        return NextResponse.json(theme, {status: 201})
    } catch (err) {
        return NextResponse.json({ error: err.message}, {status: 400})
    }
}