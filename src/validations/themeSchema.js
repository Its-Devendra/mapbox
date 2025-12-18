import { z } from 'zod';

export const themeSchema = z.object({
    primary: z.string(),
    secondary: z.string(),
    tertiary: z.string().optional(),
    quaternary: z.string().optional(),
    filterPrimary: z.string().optional().nullable(),
    filterSecondary: z.string().optional().nullable(),
    filterTertiary: z.string().optional().nullable(),
    filterQuaternary: z.string().optional().nullable(),
    mapboxStyle: z.string(),
    customStyleUrl: z.string().optional().nullable(),
    projectId: z.string(),
    isActive: z.boolean().optional(),

})