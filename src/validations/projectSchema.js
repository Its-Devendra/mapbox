import { z } from 'zod';

export const projectSchema = z.object({
    name: z.string().min(1, "Name is required"),
    slug: z.string().min(1, "Slug is required"),
    isActive: z.boolean().optional(),
    clientBuildingIcon: z.string().nullable().optional(),
    clientBuildingIconWidth: z.number().int().min(10).max(200).optional(),
    clientBuildingIconHeight: z.number().int().min(10).max(200).optional(),
    clientBuildingUrl: z.string().url().nullable().optional().or(z.literal('')),
    clientBuildingLat: z.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90").nullable().optional(),
    clientBuildingLng: z.number().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180").nullable().optional(),
    clientBuildingName: z.string().min(1, "Name must not be empty").nullable().optional(),
    clientBuildingDescription: z.string().nullable().optional(),
    logo: z.string().nullable().optional(),
    logoWidth: z.number().int().min(10).max(500).optional(),
    logoHeight: z.number().int().min(10).max(500).optional(),
    secondaryLogo: z.string().nullable().optional(),
    secondaryLogoWidth: z.number().int().min(10).max(500).optional(),
    secondaryLogoHeight: z.number().int().min(10).max(500).optional(),
    introAudio: z.string().nullable().optional(), // URL to S3 audio file
});



