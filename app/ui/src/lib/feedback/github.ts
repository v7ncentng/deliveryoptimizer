import {
  buildFeedbackIssueBody,
  buildFeedbackIssueTitle,
  feedbackLabelsForCategory,
  type ScreenshotReference,
} from "./issue";
import type { FeedbackPayload } from "./schema";
import { createGitHubAppJwt } from "./security";

type InstallationTokenResponse = {
  token?: string;
  expires_at?: string;
};

type GitHubIssueResponse = {
  html_url?: string;
};

type CachedInstallationToken = {
  installationId: string;
  token: string;
  expiresAtMs: number;
};

const installationTokenRefreshSkewMs = 5 * 60 * 1000;
const fallbackInstallationTokenTtlMs = 55 * 60 * 1000;

let cachedInstallationToken: CachedInstallationToken | null = null;
let pendingInstallationToken: {
  installationId: string;
  promise: Promise<CachedInstallationToken>;
} | null = null;

export async function createFeedbackIssue(
  payload: FeedbackPayload,
  screenshot?: ScreenshotReference,
): Promise<string> {
  const repository = process.env.FEEDBACK_GITHUB_REPO;
  const installationId = process.env.FEEDBACK_GITHUB_INSTALLATION_ID;

  if (!repository || !installationId) {
    throw new Error("Feedback GitHub repository is not configured.");
  }

  const installationToken = await getGitHubInstallationToken(installationId);

  const issueResponse = await fetch(
    `https://api.github.com/repos/${repository}/issues`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${installationToken}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        title: buildFeedbackIssueTitle(payload),
        body: buildFeedbackIssueBody(payload, screenshot),
        labels: feedbackLabelsForCategory(payload.category),
      }),
    },
  );

  if (!issueResponse.ok) {
    throw new Error("Failed to create GitHub issue.");
  }

  const issueJson = (await issueResponse.json()) as GitHubIssueResponse;
  if (!issueJson.html_url) {
    throw new Error("GitHub issue response did not include a URL.");
  }

  return issueJson.html_url;
}

async function getGitHubInstallationToken(
  installationId: string,
): Promise<string> {
  const nowMs = Date.now();
  const cachedToken = getUsableCachedInstallationToken(installationId, nowMs);
  if (cachedToken) {
    return cachedToken.token;
  }

  if (pendingInstallationToken?.installationId === installationId) {
    const token = await pendingInstallationToken.promise;
    return token.token;
  }

  const promise = requestGitHubInstallationToken(installationId, nowMs);
  pendingInstallationToken = { installationId, promise };

  try {
    const token = await promise;
    cachedInstallationToken = token;
    return token.token;
  } finally {
    if (pendingInstallationToken?.promise === promise) {
      pendingInstallationToken = null;
    }
  }
}

function getUsableCachedInstallationToken(
  installationId: string,
  nowMs: number,
): CachedInstallationToken | null {
  if (
    cachedInstallationToken?.installationId === installationId &&
    cachedInstallationToken.expiresAtMs - installationTokenRefreshSkewMs > nowMs
  ) {
    return cachedInstallationToken;
  }

  return null;
}

async function requestGitHubInstallationToken(
  installationId: string,
  nowMs: number,
): Promise<CachedInstallationToken> {
  const appJwt = createGitHubAppJwt();
  const tokenResponse = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${appJwt}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!tokenResponse.ok) {
    throw new Error("Failed to create GitHub installation token.");
  }

  const tokenJson = (await tokenResponse.json()) as InstallationTokenResponse;
  if (!tokenJson.token) {
    throw new Error(
      "GitHub installation token response did not include a token.",
    );
  }

  const parsedExpiresAt = tokenJson.expires_at
    ? Date.parse(tokenJson.expires_at)
    : NaN;

  return {
    installationId,
    token: tokenJson.token,
    expiresAtMs: Number.isFinite(parsedExpiresAt)
      ? parsedExpiresAt
      : nowMs + fallbackInstallationTokenTtlMs,
  };
}
