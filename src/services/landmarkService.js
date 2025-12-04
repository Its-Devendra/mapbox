import { prisma } from "@/lib/prisma";

export async function getLandmarks(projectId = null) {
    const whereClause = projectId ? { projectId } : {};
    return prisma.landmark.findMany({
        where: whereClause,
        include: {project: true, category: true}
    });
}

export async function getLandmarksById(id) {
    return prisma.landmark.findUnique({where:{id}, include: {project: true, category: true}})
}

export async function createLandmark(data) {
    return prisma.landmark.create({data});
}

export async function updateLandmark(id, data) {
    return prisma.landmark.update({where: {id}, data})
}

export async function deleteLandmark(id) {
    return prisma.landmark.delete({where: {id}});
}