import { prisma } from "@/lib/prisma";

export async function getThemes(projectId = null) {
    const whereClause = projectId ? { projectId } : {};
    return prisma.theme.findMany({
        where: whereClause,
        include: { project: true }
    });
}

export async function getThemeById(id) {
    return prisma.theme.findUnique({ where: { id }, include: { project: true } });
}

export async function createTheme(data) {
    if (data.isActive) {
        // If this theme is being created as active, deactivate all others for this project first
        await prisma.theme.updateMany({
            where: { projectId: data.projectId },
            data: { isActive: false }
        });
    }
    return prisma.theme.create({ data })
}

export async function updateTheme(id, data) {
    if (data.isActive) {
        // If setting to active, find the project first
        const currentTheme = await prisma.theme.findUnique({
            where: { id },
            select: { projectId: true }
        });

        if (currentTheme) {
            // Deactivate all other themes for this project
            await prisma.theme.updateMany({
                where: { projectId: currentTheme.projectId },
                data: { isActive: false } // Deactivate all
            });
            // The subsequent update call will set THIS theme to true, effectively making it the single active one
        }
    }
    return prisma.theme.update({ where: { id }, data })
}

export async function deleteTheme(id) {
    return prisma.theme.delete({ where: { id } })
}