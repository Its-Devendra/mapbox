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

    // Filter Section Glass Controls
    filterGlassEnabled: z.boolean().optional(),
    filterGlassBlur: z.number().min(0).max(100).optional(),
    filterGlassSaturation: z.number().min(100).max(300).optional(),
    filterGlassOpacity: z.number().min(0).max(100).optional(),
    filterBorderOpacity: z.number().min(0).max(100).optional(),
    filterPrimaryOpacity: z.number().min(0).max(100).optional(),
    filterSecondaryOpacity: z.number().min(0).max(100).optional(),
    filterTertiaryOpacity: z.number().min(0).max(100).optional(),

    // Landmark Card Glass Controls
    landmarkGlassEnabled: z.boolean().optional(),
    landmarkGlassBlur: z.number().min(0).max(100).optional(),
    landmarkGlassSaturation: z.number().min(100).max(300).optional(),
    landmarkGlassOpacity: z.number().min(0).max(100).optional(),
    landmarkBorderOpacity: z.number().min(0).max(100).optional(),
    primaryOpacity: z.number().min(0).max(100).optional(),
    secondaryOpacity: z.number().min(0).max(100).optional(),
    tertiaryOpacity: z.number().min(0).max(100).optional(),
})