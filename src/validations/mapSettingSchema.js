import { z } from "zod";

export const mapSettingSchema = z.object({
  projectId: z.string(),
  defaultCenterLat: z.number().optional(),
  defaultCenterLng: z.number().optional(),
  defaultZoom: z.number().optional(),
  minZoom: z.number().optional(),
  maxZoom: z.number().optional(),
  enableRotation: z.boolean().optional(),
  enablePitch: z.boolean().optional(),
  enable3DBuildings: z.boolean().optional(),
  buildings3DMinZoom: z.number().optional(),
  routeLineColor: z.string().optional(),
  routeLineWidth: z.number().optional(),
  initialAnimationDuration: z.number().optional(),
  routeAnimationDuration: z.number().optional(),
  useDefaultCameraAfterLoad: z.boolean().optional(),
  defaultPitch: z.number().min(0).max(85).optional(),
  defaultBearing: z.number().min(-180).max(180).optional(),
  southWestLat: z.number().optional(),
  southWestLng: z.number().optional(),
  northEastLat: z.number().optional(),
  northEastLng: z.number().optional(),
  isActive: z.boolean().optional(),
});

