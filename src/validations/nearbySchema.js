import { z } from 'zod';

export const nearbySchema = z.object({
    title: z.string().min(1),
    latitude: z.number(),
    longitude: z.number(),
    categoryId: z.string(),
    projectId: z.string(),
    icon: z.string().nullable().optional(),
    iconWidth: z.number().int().min(10).max(200).optional(),
    iconWidth: z.number().int().min(10).max(200).optional(),
    iconHeight: z.number().int().min(10).max(200).optional(),
    color: z.string().optional()
})




