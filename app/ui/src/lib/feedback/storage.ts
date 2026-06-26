import { randomUUID } from "node:crypto";

import {
  feedbackScreenshotMaxBytes,
  feedbackScreenshotTooLargeMessage,
  feedbackScreenshotUnsupportedMessage,
  InvalidFeedbackScreenshotError,
} from "./screenshot";

const metadataTokenUrl =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";

type MetadataTokenResponse = {
  access_token?: string;
};

export type DecodedScreenshot = {
  bytes: Buffer;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
};

export function decodeScreenshotDataUrl(dataUrl: string): DecodedScreenshot {
  const match =
    /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) {
    throw new InvalidFeedbackScreenshotError(
      feedbackScreenshotUnsupportedMessage,
    );
  }

  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > feedbackScreenshotMaxBytes) {
    throw new InvalidFeedbackScreenshotError(feedbackScreenshotTooLargeMessage);
  }

  return {
    bytes,
    mimeType: match[1] as DecodedScreenshot["mimeType"],
  };
}

export async function uploadFeedbackScreenshot(
  dataUrl: string,
  now = new Date(),
): Promise<{ bucket: string; objectName: string }> {
  const screenshot = decodeScreenshotDataUrl(dataUrl);
  const bucket = process.env.FEEDBACK_SCREENSHOT_BUCKET;
  if (!bucket) {
    throw new Error("Feedback screenshot bucket is not configured.");
  }

  const extension = screenshot.mimeType.split("/")[1].replace("jpeg", "jpg");
  const objectName = `feedback/screenshots/${formatDate(now)}/${randomUUID()}.${extension}`;
  const token = await getGoogleAccessToken();

  const response = await fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(
      bucket,
    )}/o?uploadType=media&name=${encodeURIComponent(objectName)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": screenshot.mimeType,
      },
      body: new Uint8Array(screenshot.bytes),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to upload feedback screenshot.");
  }

  return { bucket, objectName };
}

export async function isFeedbackShutdownGuardActive(
  now = new Date(),
): Promise<boolean> {
  if (process.env.FEEDBACK_SHUTDOWN === "1") return true;

  const bucket = process.env.FEEDBACK_SCREENSHOT_BUCKET;
  if (!bucket) return false;

  try {
    const token = await getGoogleAccessToken();
    const response = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(
        bucket,
      )}/o/${encodeURIComponent(feedbackShutdownGuardObjectName(now))}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    return response.ok;
  } catch {
    return false;
  }
}

export async function writeFeedbackShutdownGuard(
  reason: string,
  now = new Date(),
): Promise<void> {
  const bucket = process.env.FEEDBACK_SCREENSHOT_BUCKET;
  if (!bucket) return;

  const token = await getGoogleAccessToken();
  const body = JSON.stringify({
    reason,
    date: formatDate(now),
    createdAt: now.toISOString(),
  });

  await fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(
      bucket,
    )}/o?uploadType=media&name=${encodeURIComponent(feedbackShutdownGuardObjectName(now))}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body,
    },
  );
}

async function getGoogleAccessToken(): Promise<string> {
  const response = await fetch(metadataTokenUrl, {
    headers: { "Metadata-Flavor": "Google" },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Google application access token.");
  }

  const json = (await response.json()) as MetadataTokenResponse;
  if (!json.access_token) {
    throw new Error(
      "Google metadata token response did not include an access token.",
    );
  }

  return json.access_token;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function feedbackShutdownGuardObjectName(now = new Date()): string {
  return `feedback/guard/shutdown-${formatDate(now)}.json`;
}
