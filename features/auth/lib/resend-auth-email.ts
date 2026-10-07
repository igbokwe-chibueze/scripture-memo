import "server-only";

import { Resend } from "resend";

/** Content passed to the common Resend sender for transactional auth mail. */
export type ResendAuthEmail = {
  recipientEmail: string;
  subject: string;
  text: string;
  html: string;
};

/** A request-scoped transport closure with validated production credentials. */
export type ResendAuthEmailSender = (
  message: ResendAuthEmail,
) => Promise<void>;

/**
 * Validates the shared production email credentials once and returns a sender
 * closure. Both verification and password-reset messages use this provider
 * boundary so they share one domain, API key, and safe error contract.
 */
export function createResendAuthEmailSender(): ResendAuthEmailSender {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required for production auth email.");
  }

  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is required for production auth email.");
  }

  const resend = new Resend(apiKey);

  return async (message: ResendAuthEmail): Promise<void> => {
    const { error } = await resend.emails.send({
      from,
      to: [message.recipientEmail],
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    if (error) {
      // WHY: Provider errors can contain recipient data or request details.
      // Callers log only a fixed safe event name rather than this error object.
      throw new Error("Resend rejected an auth email.");
    }
  };
}

/** Escapes untrusted values before including them in a simple HTML email. */
export function escapeAuthEmailHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
