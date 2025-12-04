import { prisma } from "@/lib/prisma";

export async function getCategories(projectId = null) {
    const whereClause = projectId ? { projectId } : {};
    return prisma.category.findMany({
        where: whereClause,
        include: {project: true, landmarks: true}
    });
}

export async function getCategoriesById(id) {
    return prisma.category.findUnique({ where: {id}, include: {project: true, landmarkSchemas: true}})
}

export async function createCategory(data) {
    return prisma.category.create({data})
}

export async function updateCategory(id, data) {
    return prisma.category.update({where: {id}, data});
}

export async function deleteCategory(id) {
    return prisma.category.delete({where: {id}})
}