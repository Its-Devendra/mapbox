import { prisma } from "@/lib/prisma";

export async function getProjects () {
    return await prisma.project.findMany({
        include: {themes: true, categories: true, landmarks: true, settings: true},
    });
}

export async function getProjectById(id) {
    return prisma.project.findUnique({
        where: {id},
        include: {themes: true, categories: true, landmarks: true, settings: true},
    })
}

export async function createProject(data) {
    return prisma.project.create({
        data,
    })
}

export async function updateProject(id, data) {
    return prisma.project.update({
        where: {id}, data
    })
}

export async function deleteProject(id) {
    return prisma.project.delete({where: {id}});
}