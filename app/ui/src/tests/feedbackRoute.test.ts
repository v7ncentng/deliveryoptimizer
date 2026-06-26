import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

describe("feedback route guard ordering", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T12:00:00.000Z"));
    vi.resetModules();
    clearFeedbackEnv();
    process.env.FEEDBACK_RATE_LIMIT_WINDOW_MS = "600000";
    process.env.FEEDBACK_RATE_LIMIT_MAX = "10";
    process.env.FEEDBACK_DAILY_SHUTDOWN_THRESHOLD = "100";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    vi.doUnmock("@/lib/feedback/github");
    vi.doUnmock("@/lib/feedback/security");
    vi.doUnmock("@/lib/feedback/storage");
    restoreFeedbackEnv();
  });

  it("applies the local rate limit before checking the remote guard", async () => {
    process.env.FEEDBACK_RATE_LIMIT_MAX = "1";
    const { POST, storage } = await importRouteWithMocks();

    const first = await POST(feedbackRequest("203.0.113.10"));
    expect(first.status).toBe(201);
    expect(storage.isFeedbackShutdownGuardActive).toHaveBeenCalledTimes(1);

    storage.isFeedbackShutdownGuardActive.mockClear();
    const second = await POST(feedbackRequest("203.0.113.10"));

    expect(second.status).toBe(429);
    expect(storage.isFeedbackShutdownGuardActive).not.toHaveBeenCalled();
  });

  it("expires the in-memory daily shutdown on the next UTC day", async () => {
    process.env.FEEDBACK_DAILY_SHUTDOWN_THRESHOLD = "1";
    const { POST, storage } = await importRouteWithMocks();

    const accepted = await POST(feedbackRequest("203.0.113.20"));
    expect(accepted.status).toBe(201);
    expect(storage.writeFeedbackShutdownGuard).toHaveBeenCalledTimes(1);
    expect(storage.writeFeedbackShutdownGuard.mock.calls[0][1]).toEqual(
      new Date("2026-05-14T12:00:00.000Z"),
    );

    const sameDay = await POST(feedbackRequest("203.0.113.21"));
    expect(sameDay.status).toBe(503);

    vi.setSystemTime(new Date("2026-05-15T00:01:00.000Z"));
    const nextDay = await POST(feedbackRequest("203.0.113.22"));

    expect(nextDay.status).toBe(201);
  });
});

async function importRouteWithMocks() {
  const github = {
    createFeedbackIssue: vi.fn(
      async () => "https://github.com/example/repo/issues/1",
    ),
  };
  const security = {
    verifyRecaptchaToken: vi.fn(async () => ({ ok: true })),
  };
  const storage = {
    isFeedbackShutdownGuardActive: vi.fn<(now?: Date) => Promise<boolean>>(
      async () => false,
    ),
    uploadFeedbackScreenshot: vi.fn<
      (dataUrl: string) => Promise<{ bucket: string; objectName: string }>
    >(async () => ({
      bucket: "feedback-private",
      objectName: "feedback/screenshots/test.jpg",
    })),
    writeFeedbackShutdownGuard: vi.fn<
      (reason: string, now?: Date) => Promise<void>
    >(async () => undefined),
  };

  vi.doMock("@/lib/feedback/github", () => github);
  vi.doMock("@/lib/feedback/security", () => security);
  vi.doMock("@/lib/feedback/storage", () => storage);

  const route = await import("@/app/api/feedback/route");
  return { POST: route.POST, github, security, storage };
}

function feedbackRequest(clientIp: string): Request {
  return new Request("http://localhost/api/feedback", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": clientIp,
    },
    body: JSON.stringify({
      category: "bug",
      message: "The route editor failed to save the latest stop.",
      diagnostics: {},
      recaptchaToken: "token",
    }),
  });
}

function clearFeedbackEnv() {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("FEEDBACK_")) delete process.env[key];
  }
}

function restoreFeedbackEnv() {
  clearFeedbackEnv();
  for (const [key, value] of Object.entries(originalEnv)) {
    if (key.startsWith("FEEDBACK_") && value !== undefined) {
      process.env[key] = value;
    }
  }
}
