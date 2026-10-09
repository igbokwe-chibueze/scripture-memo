import "server-only";

import { after } from "next/server";
import { logger } from "@/lib/logger";
import {
  createResendAuthEmailSender,
  escapeAuthEmailHtml,
} from "@/features/auth/lib/resend-auth-email";

export type ProductionPasswordResetMessage = {
  recipientEmail: string;
  resetUrl: string;
};

/**
 * Sends Better Auth's password-reset URL through the shared Resend provider.
 *
 * Better Auth supplies the secured URL and retains ownership of token creation,
 * expiry, validation, password hashing, and session revocation. `after()` keeps
 * the provider request attached to the current Next.js request while letting
 * the generic password-reset response complete without exposing account state.
 * Provider failures are logged as a fixed event without addresses, URLs, or
 * raw provider responses.
 */
export async function sendProductionPasswordReset(
  message: ProductionPasswordResetMessage,
): Promise<void> {
  const sendEmail = createResendAuthEmailSender();
  const safeResetUrl = escapeAuthEmailHtml(message.resetUrl);

  after(async () => {
    try {
      await sendEmail({
        recipientEmail: message.recipientEmail,
        subject: "Reset your Scripture Memo password",
        text: [
          "We received a request to reset your Scripture Memo password.",
          "",
          "Use this link to choose a new password:",
          message.resetUrl,
          "",
          "If you did not request a reset, you can ignore this email.",
        ].join("\n"),
        html: [
          "<main style=\"font-family:Arial,sans-serif;line-height:1.6;color:#16333B\">",
          "<h1>Reset your Scripture Memo password</h1>",
          "<p>We received a request to reset your password.</p>",
          `<p><a href=\"${safeResetUrl}\">Choose a new password</a></p>`,
          "<p>If you did not request a reset, you can ignore this email.</p>",
          "</main>",
        ].join(""),
      });
    } catch {
      logger.error("Resend password-reset delivery failed.", {
        provider: "Resend",
      });
    }
  });
}
