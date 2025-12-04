import { prisma } from "@/lib/prisma";

export async function getThemes(projectId = null) {
    const whereClause = projectId ? { projectId } : {};
    return prisma.theme.findMany({
        where: whereClause,
        include: {project: true}
    });
}

export async function getThemeById(id) {
    return prisma.theme.findUnique({ where: {id}, include: {project: true}});
}

export async function createTheme(data) {
    return prisma.theme.create({data})
}

export async function updateTheme(id, data) {
    return prisma.theme.update({ where: {id}, data})
}

export async function deleteTheme(id) {
    return prisma.theme.delete({where: {id}})
}