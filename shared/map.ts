import { z } from 'zod';

export const LocationQuerySchema = z.string().trim().min(1).max(200);
export const MapLocationSchema = z.strictObject({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  label: z.string().min(1).max(500),
});
export const LocationResponseSchema = z.strictObject({ location: MapLocationSchema.nullable() });
export type MapLocation = z.infer<typeof MapLocationSchema>;
