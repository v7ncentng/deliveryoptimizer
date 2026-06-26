import { afterEach, describe, expect, it, vi } from "vitest";

import type { FeedbackPayload } from "@/lib/feedback/schema";

const originalEnv = { ...process.env };

const payload: FeedbackPayload = {
  category: "bug",
  message: "The route map does not redraw after I move a stop.",
  diagnostics: {},
};

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
  vi.doUnmock("@/lib/feedback/security");
  vi.unstubAllGlobals();
  restoreFeedbackEnv();
});

describe("feedback GitHub issue creation", () => {
  it("reuses a valid installation token for subsequent issues", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T12:00:00.000Z"));
    clearFeedbackEnv();
    process.env.FEEDBACK_GITHUB_REPO = "owner/repo";
    process.env.FEEDBACK_GITHUB_INSTALLATION_ID = "12345";

    vi.doMock("@/lib/feedback/security", () => ({
      createGitHubAppJwt: vi.fn(() => "app-jwt"),
    }));

    const fetchMock = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >(async (input, init) => {
      const url = String(input);

      if (url.includes("/access_tokens")) {
        return new Response(
          JSON.stringify({
            token: "installation-token",
            expires_at: "2026-05-14T13:00:00.000Z",
          }),
          { status: 201 },
        );
      }

      if (url.endsWith("/issues")) {
        expect((init?.headers as Record<string, string>).Authorization).toBe(
          "Bearer installation-token",
        );
        return new Response(
          JSON.stringify({
            html_url: "https://github.com/owner/repo/issues/1",
          }),
          { status: 201 },
        );
      }

      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { createFeedbackIssue } = await import("@/lib/feedback/github");

    await createFeedbackIssue(payload);
    await createFeedbackIssue(payload);

    expect(countFetches(fetchMock, "/access_tokens")).toBe(1);
    expect(countFetches(fetchMock, "/issues")).toBe(2);
  });
});

function countFetches(
  fetchMock: ReturnType<typeof vi.fn>,
  urlPart: string,
): number {
  return fetchMock.mock.calls.filter(([input]) =>
    String(input).includes(urlPart),
  ).length;
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
