import { prisma } from "@/lib/prisma";
import { invalidateCache } from "@/lib/cache";

export async function getCategories(projectId = null) {
    const whereClause = projectId ? { projectId } : {};
    return prisma.category.findMany({
        where: whereClause,
        include: {
            project: true,
            _count: {
                select: { 
                    landmarks: true,
                    nearByPlaces: true
                }
            }
        }
    });
}

export async function getCategoriesById(id) {
    return prisma.category.findUnique({ where: {id}, include: {project: true, landmarkSchemas: true}})
}

export async function createCategory(data) {
    const category = await prisma.category.create({data});
    
    // Invalidate cache so map refreshes
    if (data.projectId) {
        invalidateCache.landmarks(data.projectId);
        invalidateCache.nearby(data.projectId);
    }
    
    return category;
}

export async function updateCategory(id, data) {
    const category = await prisma.category.update({
        where: {id}, 
        data,
        include: { project: true }
    });
    
    // Invalidate cache so map refreshes with new category defaults
    if (category.projectId) {
        invalidateCache.landmarks(category.projectId);
        invalidateCache.nearby(category.projectId);
    }
    
    return category;
}

export async function deleteCategory(id) {
    const category = await prisma.category.delete({ where: {id} });
    
    // Invalidate cache
    if (category.projectId) {
        invalidateCache.landmarks(category.projectId);
        invalidateCache.nearby(category.projectId);
    }
    
    return category;
}