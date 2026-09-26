import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { after } from "next/server";
import { Resend } from "resend";
import { logger } from "@/lib/logger";

export const AUTH_EMAIL_DELIVERY_MODES = {
  LIGHT_DEV: "LIGHT_DEV",
  RESEND: "RESEND",
} as const;

export type AuthEmailDeliveryMode =
  (typeof AUTH_EMAIL_DELIVERY_MODES)[keyof typeof AUTH_EMAIL_DELIVERY_MODES];

export type VerificationEmailContext = {
  recipientEmail: string;
  verificationUrl: string;
};

export type VerificationCaptureResult<T> =
  | { success: true; value: T; verificationUrl?: string }
  | { success: false; error: unknown; verificationUrl?: string };

type VerificationCapture = {
  verificationUrl?: string;
};

const verificationCaptureStorage =
  new AsyncLocalStorage<VerificationCapture>();

/**
 * Resolves the configured auth-email transport without reading process globals.
 * Development and tests default to an in-memory Light Dev capture so they do
 * not need a Resend account or consume email-provider quota. Production defaults
 * to Resend and explicitly rejects Light Dev because returning a live bearer
 * link in an application response would bypass proof of mailbox ownership.
 */
export function resolveAuthEmailDeliveryMode(
  configuredMode: string | undefined,
  nodeEnvironment: string | undefined,
): AuthEmailDeliveryMode {
  const normalizedMode = configuredMode?.trim().toUpperCase();
  const defaultMode =
    nodeEnvironment === "production"
      ? AUTH_EMAIL_DELIVERY_MODES.RESEND
      : AUTH_EMAIL_DELIVERY_MODES.LIGHT_DEV;
  const mode = normalizedMode ?? defaultMode;

  if (
    mode !== AUTH_EMAIL_DELIVERY_MODES.LIGHT_DEV &&
    mode !== AUTH_EMAIL_DELIVERY_MODES.RESEND
  ) {
    throw new Error("AUTH_EMAIL_DELIVERY_MODE must be LIGHT_DEV or RESEND.");
  }

  if (
    nodeEnvironment === "production" &&
    mode === AUTH_EMAIL_DELIVERY_MODES.LIGHT_DEV
  ) {
    throw new Error("LIGHT_DEV auth email delivery is forbidden in production.");
  }

  return mode;
}

/** Reads the auth-email delivery mode from the server environment. */
export function getAuthEmailDeliveryMode(): AuthEmailDeliveryMode {
  return resolveAuthEmailDeliveryMode(
    process.env.AUTH_EMAIL_DELIVERY_MODE,
    process.env.NODE_ENV,
  );
}

/**
 * Runs one Better Auth operation while capturing any verification URL it asks
 * the configured delivery callback to send. The capture is request-scoped so
 * concurrent registrations or sign-ins cannot receive one another's token.
 * The operation error is returned rather than thrown so callers can still
 * safely inspect a URL captured immediately before Better Auth reports that an
 * unverified account cannot sign in. Callers must only return captured URLs in
 * the local Light Dev flow; production always sends them through Resend.
 */
export async function captureVerificationEmail<T>(
  operation: () => Promise<T>,
): Promise<VerificationCaptureResult<T>> {
  const capture: VerificationCapture = {};

  return verificationCaptureStorage.run(capture, async () => {
    try {
      const value = await operation();
      return {
        success: true,
        value,
        verificationUrl: capture.verificationUrl,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error,
        verificationUrl: capture.verificationUrl,
      };
    }
  });
}

/**
 * Delivers a Better Auth-generated verification URL without generating or
 * storing tokens itself. Light Dev captures the URL only inside an explicitly
 * wrapped Server Action; direct Better Auth requests cannot retrieve it. In
 * production, Next.js `after()` lets the response finish before the Resend API
 * call, while keeping the work attached to the request lifecycle. Delivery
 * failures are logged without recipient addresses, API responses, or bearer
 * URLs so the verification token cannot leak into application logs.
 */
export function deliverVerificationEmail(
  message: VerificationEmailContext,
): void {
  const mode = getAuthEmailDeliveryMode();

  if (mode === AUTH_EMAIL_DELIVERY_MODES.LIGHT_DEV) {
    const capture = verificationCaptureStorage.getStore();

    if (!capture) {
      logger.warn(
        "A Light Dev verification URL was requested outside a wrapped auth action.",
      );
      return;
    }

    capture.verificationUrl = message.verificationUrl;
    return;
  }

  const client = getResendClient();

  after(async () => {
    try {
      const { error } = await client.emails.send({
        from: getResendSender(),
        to: [message.recipientEmail],
        subject: "Verify your Scripture Memo email",
        text: [
          "Welcome to Scripture Memo.",
          "",
          "Verify your email address to sign in:",
          message.verificationUrl,
          "",
          "If you did not create this account, you can ignore this email.",
        ].join("\n"),
        html: buildVerificationEmailHtml(message.verificationUrl),
      });

      if (error) {
        logger.error("Resend rejected a verification email.", {
          provider: "Resend",
        });
      }
    } catch {
      logger.error("Verification email delivery failed.", {
        provider: "Resend",
      });
    }
  });
}

/** Creates a server-only Resend client after validating the required secret. */
function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required for production auth email.");
  }

  if (!process.env.RESEND_FROM_EMAIL?.trim()) {
    throw new Error("RESEND_FROM_EMAIL is required for production auth email.");
  }

  return new Resend(apiKey);
}

/** Returns the configured sender address without exposing it to client code. */
function getResendSender(): string {
  const sender = process.env.RESEND_FROM_EMAIL?.trim();

  if (!sender) {
    throw new Error("RESEND_FROM_EMAIL is required for production auth email.");
  }

  return sender;
}

/** Escapes a URL before embedding it in the HTML email body. */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Builds a small, readable email body using only Better Auth's signed URL. */
function buildVerificationEmailHtml(verificationUrl: string): string {
  const safeUrl = escapeHtml(verificationUrl);

  return [
    "<main style=\"font-family:Arial,sans-serif;line-height:1.6;color:#191827\">",
    "<h1>Welcome to Scripture Memo</h1>",
    "<p>Verify your email address to sign in to your account.</p>",
    `<p><a href=\"${safeUrl}\">Verify email address</a></p>`,
    "<p>If you did not create this account, you can ignore this email.</p>",
    "</main>",
  ].join("");
}
