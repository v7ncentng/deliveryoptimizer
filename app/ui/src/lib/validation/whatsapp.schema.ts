import { z } from "zod";

export const E164_PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

export const driverPhoneNumberSchema = z
  .string()
  .trim()
  .regex(
    E164_PHONE_REGEX,
    "Enter a valid phone number with country code, e.g. +14155551234",
  );

export const sendRouteItemSchema = z.object({
  vehicleId: z.string().min(1),
  driverPhoneNumber: driverPhoneNumberSchema,
  route: z.record(z.string(), z.unknown()),
});

/**
 * Ensure each vehicleId is unique
 */
export const sendRoutesRequestSchema = z.object({
  routes: z
    .array(sendRouteItemSchema)
    .min(1, "Select at least one route to send")
    .superRefine((routes, ctx) => {
      const seen = new Set<string>();

      routes.forEach((route, index) => {
        if (seen.has(route.vehicleId)) {
          ctx.addIssue({
            code: "custom",
            message: `Duplicate vehicleId: ${route.vehicleId}`,
            path: [index, "vehicleId"],
          });
        }

        seen.add(route.vehicleId);
      });
    }),
});

export type SendRouteItem = z.infer<typeof sendRouteItemSchema>;
export type SendRoutesRequest = z.infer<typeof sendRoutesRequestSchema>;
