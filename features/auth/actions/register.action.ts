"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/types/api";
import { registerSchema } from "@/features/auth/schemas/register.schema";
import { captureVerificationEmail } from "@/features/auth/lib/email-verification-delivery";
import { getSafePostLoginPath } from "@/features/auth/lib/get-safe-post-login-path";

type RegisterResult = {
  verificationPending: true;
  lightDevDownload?: { fileName: string; content: string };
};

/** Creates an unverified Better Auth identity and starts email verification. */
export async function registerAction(
  input: unknown,
): Promise<ActionResult<RegisterResult>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for") ?? "unknown";
  const limit = rateLimit({
    key: `register:${forwardedFor.split(",").at(-1)?.trim()}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  if (!limit.success) {
    return {
      success: false,
      message: "Too many registration attempts. Please try again later.",
    };
  }

  try {
    const safeNextPath = getSafePostLoginPath(parsed.data.nextPath);
    const callbackURL = `/login?verified=1&next=${encodeURIComponent(safeNextPath)}`;
    const capture = await captureVerificationEmail(() =>
      auth.api.signUpEmail({
        body: {
          name: parsed.data.name,
          email: parsed.data.email,
          password: parsed.data.password,
          callbackURL,
        },
        headers: requestHeaders,
      }),
    );

    if (!capture.success) {
      return {
        success: false,
        message: "We could not start email verification. Please try again later.",
      };
    }

    return {
      success: true,
      // WHY: Keep the message identical for new and existing addresses. Better
      // Auth deliberately returns a synthetic user for duplicate registrations
      // when verification is required, so this action must not initialize
      // profile or progression rows using the returned ID.
      message: "Check your email for a verification link before logging in.",
      data: {
        verificationPending: true,
        lightDevDownload: capture.verificationUrl
          ? {
              fileName: "scripture-memo-email-verification.txt",
              content: [
                "Scripture Memo — local verification link",
                "",
                "Open this Better Auth link to verify your email address:",
                capture.verificationUrl,
                "",
                "This link expires in 60 minutes and should not be shared.",
              ].join("\r\n"),
            }
          : undefined,
      },
    };
  } catch {
    return {
      success: false,
      message: "We could not start email verification. Please try again later.",
    };
  }
}
