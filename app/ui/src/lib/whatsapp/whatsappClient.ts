import type { SendRouteItem } from "@/lib/validation/whatsapp.schema";

const isMockMode =
  !process.env.WHATSAPP_API_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID;

const MOCK_LATENCY_MS = Number(process.env.WHATSAPP_MOCK_LATENCY_MS ?? 600);

export type WhatsAppClientError = Error & {
  source: "whatsapp-api";
  retryable: boolean;
  status?: number;
  body?: unknown;
};

type ErrorOptions = {
  retryable: boolean;
  status?: number;
  body?: unknown;
};

function createError(
  message: string,
  options: ErrorOptions,
): WhatsAppClientError {
  const err = new Error(message) as WhatsAppClientError;
  err.source = "whatsapp-api";
  err.retryable = options.retryable;
  err.status = options.status;
  err.body = options.body;
  return err;
}

export function isWhatsAppClientError(
  error: unknown,
): error is WhatsAppClientError {
  return Boolean(
    error &&
    typeof error === "object" &&
    "source" in error &&
    (error as { source?: unknown }).source === "whatsapp-api" &&
    "retryable" in error,
  );
}

export type WhatsAppSendResult = {
  vehicleId: string;
  status: "sent";
  whatsappMessageId: string;
};

/**
 * Mocked until WHATSAPP_API_TOKEN/WHATSAPP_PHONE_NUMBER_ID are configured: logs what would
 * be sent, simulates send latency, and always reports success per route. Callers depend on
 * a per-route result array so a real implementation can later report partial failures
 * without changing this function's contract.
 */
export async function sendRoutesToWhatsApp(
  items: SendRouteItem[],
): Promise<WhatsAppSendResult[]> {
  if (!isMockMode) {
    throw createError("Real WhatsApp integration not implemented yet.", {
      retryable: false,
    });
  }

  for (const item of items) {
    console.log(
      `[whatsapp:mock] would send route ${item.vehicleId} to ${item.driverPhoneNumber}`,
      JSON.stringify(item.route),
    );
  }

  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

  return items.map((item) => ({
    vehicleId: item.vehicleId,
    status: "sent" as const,
    whatsappMessageId: `mock-${item.vehicleId}-${Date.now().toString(36)}`,
  }));
}
