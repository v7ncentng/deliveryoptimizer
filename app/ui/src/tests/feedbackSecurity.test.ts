import { afterEach, describe, expect, it, vi } from "vitest";

const originalSecret = process.env.FEEDBACK_RECAPTCHA_SECRET;

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  if (originalSecret === undefined) {
    delete process.env.FEEDBACK_RECAPTCHA_SECRET;
  } else {
    process.env.FEEDBACK_RECAPTCHA_SECRET = originalSecret;
  }
});

describe("feedback reCAPTCHA verification", () => {
  it("warns once when the secret is missing and verification is bypassed", async () => {
    delete process.env.FEEDBACK_RECAPTCHA_SECRET;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { verifyRecaptchaToken } = await import("@/lib/feedback/security");

    await expect(
      verifyRecaptchaToken(undefined, "203.0.113.1"),
    ).resolves.toEqual({ ok: true });
    await expect(
      verifyRecaptchaToken(undefined, "203.0.113.1"),
    ).resolves.toEqual({ ok: true });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      "FEEDBACK_RECAPTCHA_SECRET is not configured; feedback reCAPTCHA verification is disabled.",
    );
    warn.mockRestore();
  });
});
