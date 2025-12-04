import { prisma } from "@/lib/prisma";

export async function getMapSettings() {
    return prisma.mapSetting.findMany({ include: {project: true}});
}

export async function getMapSettingsById(id) {
    return prisma.mapSetting.findUnique({ where: {id}, include: {project: true}})
}

export async function createMapSetting(data) {
    return prisma.mapSetting.create({data});
}

export async function updateMapSetting(id, data) {
    return prisma.mapSetting.update({ where: {id}, data});
}

export async function deleteMapSetting(id) {
    return prisma.mapSetting.delete({ where: {id}})
}