import { z } from "zod";

import { deliveriesSchema } from "./delivery.schema";
import { locationSchema, loadSchema } from "./common.schema";

const sessionVehicleSchema = z
  .object({
    id: z.number().int().nonnegative(),
    vehicleType: z.enum(["truck", "car", "bicycle"]),
    driverName: z.string().min(1).optional(),
    startLocation: locationSchema.optional(),
    endLocation: locationSchema.optional(),
    capacity: loadSchema,
    departureTime: z.number().int().nonnegative().optional(),
    returnTime: z.number().int().nonnegative().optional(),
  })
  .refine(
    (data) =>
      (data.departureTime == null && data.returnTime == null) ||
      (data.departureTime != null && data.returnTime != null),
    {
      message: "departureTime and returnTime must both be set or both omitted",
      path: ["returnTime"],
    },
  )
  .refine(
    (data) =>
      data.departureTime == null ||
      data.returnTime == null ||
      data.returnTime > data.departureTime,
    { message: "returnTime must be after departureTime", path: ["returnTime"] },
  );

const sessionVehiclesSchema = z
  .array(sessionVehicleSchema)
  .superRefine((vehicles, ctx) => {
    const seen = new Set<number>();

    vehicles.forEach((vehicle, index) => {
      if (seen.has(vehicle.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate vehicle id: ${vehicle.id}`,
          path: [index, "id"],
        });
      }

      seen.add(vehicle.id);
    });
  });

export const sessionSaveDataSchema = z.object({
  deliveries: deliveriesSchema.min(1),
  vehicles: sessionVehiclesSchema.min(1),
});

export const sessionSaveV1Schema = z.object({
  version: z.literal(1),
  savedAt: z.string().datetime(),
  data: sessionSaveDataSchema,
});

export type SessionSaveV1 = z.infer<typeof sessionSaveV1Schema>;

export const sessionSaveSchema = z.discriminatedUnion("version", [
  sessionSaveV1Schema,
]);

export type SessionSaveFile = z.infer<typeof sessionSaveSchema>;
export type SessionSaveData = z.infer<typeof sessionSaveDataSchema>;

export function migrateSessionSaveFile(input: unknown): SessionSaveFile {
  const parsed = sessionSaveSchema.parse(input);

  switch (parsed.version) {
    case 1:
      return parsed;
  }
}
