import "server-only";

import { z } from "@/lib/zod";

const verificationPayloadSchema = z.object({
  email: z.email(),
});

/**
 * Reads the email claim needed to locate a locally issued verification-token
 * digest before Better Auth handles the request. This deliberately does not
 * trust the decoded claim as proof of identity: the repository additionally
 * requires a keyed digest of the complete token that was created by the
 * server, and Better Auth still validates the JWT signature and expiry before
 * changing the account. Invalid input safely returns null for a friendly
 * invalid-link redirect.
 */
export function getVerificationTokenEmail(token: string): string | null {
  const tokenParts = token.split(".");
  const payloadSegment = tokenParts[1];

  if (tokenParts.length !== 3 || !payloadSegment) return null;

  try {
    const payloadValue: unknown = JSON.parse(
      Buffer.from(payloadSegment, "base64url").toString("utf8"),
    );
    const parsedPayload = verificationPayloadSchema.safeParse(payloadValue);

    if (!parsedPayload.success) return null;

    return parsedPayload.data.email.trim().toLowerCase();
  } catch {
    return null;
  }
}
