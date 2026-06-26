import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/whatsapp/send-route/route";
import { sendRoutesToWhatsApp } from "@/lib/whatsapp/whatsappClient";

vi.mock("@/lib/whatsapp/whatsappClient", () => ({
  sendRoutesToWhatsApp: vi.fn(),
}));

const mockSendRoutesToWhatsApp = vi.mocked(sendRoutesToWhatsApp);

function request(body: unknown) {
  return new Request("http://localhost/api/whatsapp/send-route", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function validBody() {
  return {
    routes: [
      {
        vehicleId: "vehicle-1",
        driverPhoneNumber: "+14155551234",
        route: { driverName: "Jim" },
      },
    ],
  };
}

describe("POST /api/whatsapp/send-route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 on invalid JSON", async () => {
    const response = await POST(request("not json"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid JSON format" });
  });

  it("returns 400 with a friendly message on an invalid phone number", async () => {
    const body = validBody();
    body.routes[0].driverPhoneNumber = "4155551234";

    const response = await POST(request(body));

    expect(response.status).toBe(400);
    const json = (await response.json()) as { error: string };
    expect(json.error).toContain("valid phone number");
    expect(mockSendRoutesToWhatsApp).not.toHaveBeenCalled();
  });

  it("returns 200 with results on success", async () => {
    mockSendRoutesToWhatsApp.mockResolvedValue([
      { vehicleId: "vehicle-1", status: "sent", whatsappMessageId: "mock-1" },
    ]);

    const response = await POST(request(validBody()));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      results: [
        { vehicleId: "vehicle-1", status: "sent", whatsappMessageId: "mock-1" },
      ],
    });
  });

  it("returns 500 when the client throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockSendRoutesToWhatsApp.mockRejectedValue(new Error("boom"));

    const response = await POST(request(validBody()));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Failed to send routes via WhatsApp.",
    });
  });
});
