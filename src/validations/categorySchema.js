import { z } from 'zod';

export const categorySchema = z.object({
    name: z.string().min(1),
    icon: z.string().optional(),
    projectId: z.string(),
    isActive: z.boolean().optional(),
})