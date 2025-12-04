import { NextResponse } from "next/server";
import { getCategoriesById, updateCategory, deleteCategory } from "@/services/categoryService";
import { categorySchema } from "@/validations/categorySchema";

export async function GET(req, {params}) {
    const category = await getCategoriesById(params.id);
    if(!category) return NextResponse.json({error: "Not Found"}, {status: 404});
    return NextResponse.json(category);
}

export async function PUT(req, {params}) {
    try {
        const body = await req.json();
        const parsed = categorySchema.partial().parse(body);
        const category = await updateCategory(params.id, parsed);
        return NextResponse.json(category);
    } catch (err) {
        return NextResponse.json({ error: err.message}, {status: 400})
    }
}

export async function DELETE (req, {params}) {
    try {
        await deleteCategory(params.id);
        return NextResponse.json({ message: "Deleted Successfully!"})
    } catch(err) {
        return NextResponse.json({ error: err.message}, {status: 400})
    }
}