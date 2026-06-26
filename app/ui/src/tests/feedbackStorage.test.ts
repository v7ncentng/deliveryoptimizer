import { afterEach, describe, expect, it, vi } from "vitest";

import {
  decodeScreenshotDataUrl,
  isFeedbackShutdownGuardActive,
  writeFeedbackShutdownGuard,
} from "@/lib/feedback/storage";
import {
  feedbackScreenshotMaxBytes,
  feedbackScreenshotTooLargeMessage,
} from "@/lib/feedback/screenshot";

const originalBucket = process.env.FEEDBACK_SCREENSHOT_BUCKET;
const originalShutdown = process.env.FEEDBACK_SHUTDOWN;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalBucket === undefined) {
    delete process.env.FEEDBACK_SCREENSHOT_BUCKET;
  } else {
    process.env.FEEDBACK_SCREENSHOT_BUCKET = originalBucket;
  }
  if (originalShutdown === undefined) {
    delete process.env.FEEDBACK_SHUTDOWN;
  } else {
    process.env.FEEDBACK_SHUTDOWN = originalShutdown;
  }
});

describe("feedback screenshot decoding", () => {
  it("accepts supported image data URLs", () => {
    const decoded = decodeScreenshotDataUrl(
      `data:image/png;base64,${Buffer.from("fake-image").toString("base64")}`,
    );

    expect(decoded.mimeType).toBe("image/png");
    expect(decoded.bytes.toString()).toBe("fake-image");
  });

  it("rejects unsupported data URL types", () => {
    expect(() =>
      decodeScreenshotDataUrl(
        `data:text/plain;base64,${Buffer.from("x").toString("base64")}`,
      ),
    ).toThrow("Screenshot must be a PNG, JPEG, or WebP data URL.");
  });

  it("rejects screenshots over the binary size limit", () => {
    const dataUrl = `data:image/png;base64,${Buffer.alloc(
      feedbackScreenshotMaxBytes + 1,
    ).toString("base64")}`;

    expect(() => decodeScreenshotDataUrl(dataUrl)).toThrow(
      feedbackScreenshotTooLargeMessage,
    );
  });
});

describe("feedback shutdown guard storage", () => {
  it("checks the shutdown guard object for the given UTC day", async () => {
    delete process.env.FEEDBACK_SHUTDOWN;
    process.env.FEEDBACK_SCREENSHOT_BUCKET = "feedback-private";
    const fetchMock = stubGoogleStorageFetch();

    const active = await isFeedbackShutdownGuardActive(
      new Date("2026-05-14T23:30:00.000Z"),
    );

    expect(active).toBe(true);
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      encodeURIComponent("feedback/guard/shutdown-2026-05-14.json"),
    );
  });

  it("writes the shutdown guard object for the given UTC day", async () => {
    delete process.env.FEEDBACK_SHUTDOWN;
    process.env.FEEDBACK_SCREENSHOT_BUCKET = "feedback-private";
    const fetchMock = stubGoogleStorageFetch();

    await writeFeedbackShutdownGuard(
      "daily feedback threshold exceeded",
      new Date("2026-05-15T00:01:00.000Z"),
    );

    expect(String(fetchMock.mock.calls[1][0])).toContain(
      `name=${encodeURIComponent("feedback/guard/shutdown-2026-05-15.json")}`,
    );
    expect(fetchMock.mock.calls[1][1]?.body).toBe(
      JSON.stringify({
        reason: "daily feedback threshold exceeded",
        date: "2026-05-15",
        createdAt: "2026-05-15T00:01:00.000Z",
      }),
    );
  });
});

function stubGoogleStorageFetch() {
  const fetchMock = vi.fn<
    (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  >(async (input) => {
    const url = String(input);
    if (url.includes("metadata.google.internal")) {
      return new Response(JSON.stringify({ access_token: "token" }), {
        status: 200,
      });
    }

    return new Response("{}", { status: 200 });
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
