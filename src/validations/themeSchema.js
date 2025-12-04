import { z } from 'zod';

export const themeSchema = z.object({
    primary: z.string(),
    secondary: z.string(),
    mapboxStyle: z.string(),
    customStyleUrl: z.string().optional().nullable(),
    projectId: z.string(),
    isActive: z.boolean().optional(),

})