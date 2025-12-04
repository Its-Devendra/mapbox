import { NextResponse } from "next/server";
import { getCategories, createCategory } from "@/services/categoryService";
import { categorySchema } from "@/validations/categorySchema";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('projectId');

        const categories = await getCategories(projectId);
        return NextResponse.json(categories);
    } catch (error) {
        console.error('Error in GET /api/categories:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch categories' },
            { status: 500 }
        );
    }
}

export async function POST(req) {
    try{
    const body = await req.json();
    const parsed = categorySchema.parse(body);
    const category = await createCategory(parsed);
    return NextResponse.json(category, {status: 201});
} catch (err) {
    return NextResponse.json({ error: err.message}, {status: 400})
}
}