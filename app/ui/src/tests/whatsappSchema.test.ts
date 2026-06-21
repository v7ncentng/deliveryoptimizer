import { describe, expect, it } from "vitest";
import { sendRoutesRequestSchema } from "@/lib/validation/whatsapp.schema";

function validItem(vehicleId: string, phone = "+14155551234") {
  return {
    vehicleId,
    driverPhoneNumber: phone,
    route: { vehicleId, driverName: "Jim" },
  };
}

describe("sendRoutesRequestSchema", () => {
  it("accepts a valid payload", () => {
    const result = sendRoutesRequestSchema.safeParse({
      routes: [validItem("vehicle-1")],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty routes array", () => {
    const result = sendRoutesRequestSchema.safeParse({ routes: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Select at least one route to send",
      );
    }
  });

  it.each(["4155551234", "+1 415 555 1234", "not-a-phone", "+0123456789"])(
    "rejects a non-E.164 phone number: %s",
    (phone) => {
      const result = sendRoutesRequestSchema.safeParse({
        routes: [validItem("vehicle-1", phone)],
      });
      expect(result.success).toBe(false);
    },
  );

  it("rejects duplicate vehicleId entries", () => {
    const result = sendRoutesRequestSchema.safeParse({
      routes: [validItem("vehicle-1"), validItem("vehicle-1")],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Duplicate vehicleId");
    }
  });
});
