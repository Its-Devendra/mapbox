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
  useMinZoomForInitialTransition: z.boolean().optional(),
  // Deprecated rectangular bounds - nullable to allow clearing
  southWestLat: z.number().nullable().optional(),
  southWestLng: z.number().nullable().optional(),
  northEastLat: z.number().nullable().optional(),
  northEastLng: z.number().nullable().optional(),
  // Distance-based bounds - nullable to allow clearing
  maxPanDistanceKm: z.number().min(0.5).max(100).nullable().optional(),
  panCenterLat: z.number().nullable().optional(),
  panCenterLng: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
});

