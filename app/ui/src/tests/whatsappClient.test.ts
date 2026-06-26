import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  sendRoutesToWhatsApp,
  toWhatsAppRecipientNumber,
} from "@/lib/whatsapp/whatsappClient";
import type { SendRouteItem } from "@/lib/validation/whatsapp.schema";

describe("sendRoutesToWhatsApp (mock mode)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("logs the would-be payload and resolves a per-route success result", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const items: SendRouteItem[] = [
      {
        vehicleId: "vehicle-1",
        driverPhoneNumber: "+14155551234",
        route: { driverName: "Jim" },
      },
      {
        vehicleId: "vehicle-2",
        driverPhoneNumber: "+14155551235",
        route: { driverName: "Sam" },
      },
    ];

    const resultPromise = sendRoutesToWhatsApp(items);
    await vi.runAllTimersAsync();
    const results = await resultPromise;

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      vehicleId: "vehicle-1",
      status: "sent",
    });
    expect(results[0].whatsappMessageId).toContain("vehicle-1");
    expect(results[1]).toMatchObject({
      vehicleId: "vehicle-2",
      status: "sent",
    });
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy.mock.calls[0][0]).toContain("vehicle-1");
    expect(logSpy.mock.calls[0][0]).toContain("14155551234");
    expect(logSpy.mock.calls[0][0]).not.toContain("+14155551234");
  });

  it("resolves an empty array for an empty input list", async () => {
    const resultPromise = sendRoutesToWhatsApp([]);
    await vi.runAllTimersAsync();
    const results = await resultPromise;
    expect(results).toEqual([]);
  });

  it("formats E.164 numbers for the WhatsApp recipient field", () => {
    expect(toWhatsAppRecipientNumber("+14155551234")).toBe("14155551234");
    expect(toWhatsAppRecipientNumber("14155551234")).toBe("14155551234");
  });
});
