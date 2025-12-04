import { prisma } from "@/lib/prisma";

export async function getNearbyPlaces(projectId = null) {
    const whereClause = projectId ? { projectId } : {};
    return prisma.nearBy.findMany({
        where: whereClause,
        include: {project: true, category: true}
    });
}

export async function getNearbyPlaceById(id) {
    return prisma.nearBy.findUnique({where:{id}, include: {project: true, category: true}})
}

export async function createNearbyPlace(data) {
    return prisma.nearBy.create({data});
}

export async function updateNearbyPlace(id, data) {
    return prisma.nearBy.update({where: {id}, data})
}

export async function deleteNearbyPlace(id) {
    return prisma.nearBy.delete({where: {id}});
}




