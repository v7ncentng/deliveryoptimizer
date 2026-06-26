export const feedbackScreenshotMaxBytes = 2_500_000;
export const feedbackScreenshotTooLargeMessage =
  "Screenshot must be smaller than 2.5MB.";
export const feedbackScreenshotUnsupportedMessage =
  "Screenshot must be a PNG, JPEG, or WebP data URL.";

const longestSupportedDataUrlPrefixLength = "data:image/jpeg;base64,".length;
const maxBase64Length = Math.ceil(feedbackScreenshotMaxBytes / 3) * 4;

export const feedbackScreenshotDataUrlMaxLength =
  longestSupportedDataUrlPrefixLength + maxBase64Length;

export class InvalidFeedbackScreenshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidFeedbackScreenshotError";
  }
}
