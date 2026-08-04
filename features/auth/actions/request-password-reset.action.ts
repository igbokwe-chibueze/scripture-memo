"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/types/api";
import { captureLightDevResetUrl } from "@/features/auth/lib/password-reset-delivery";
import { requestPasswordResetSchema } from "@/features/auth/schemas/request-password-reset.schema";

type LightDevDownload = {
  fileName: string;
  content: string;
};

type PasswordResetRequestResult = { lightDevDownload?: LightDevDownload };

/** Requests a Better Auth reset token without revealing account existence. */
export async function requestPasswordResetAction(
  input: unknown,
): Promise<ActionResult<PasswordResetRequestResult>> {
  const parsed = requestPasswordResetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted field.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for") ?? "unknown";
  const limit = rateLimit({
    key: `password-reset-request:${forwardedFor.split(",").at(-1)?.trim()}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (!limit.success) {
    return {
      success: false,
      message: "Too many reset requests. Please try again later.",
    };
  }

  try {
    const resetUrl = await captureLightDevResetUrl(async () => {
      await auth.api.requestPasswordReset({
        body: {
          email: parsed.data.email,
          // BETTER_AUTH_URL is the deployment authority. The localhost fallback
          // exists only so Light Dev Mode works with a fresh local checkout.
          redirectTo: new URL(
            "/reset-password",
            process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
          ).toString(),
        },
        headers: requestHeaders,
      });
    });

    return {
      success: true,
      message: "If that account exists, password recovery is ready.",
      data: resetUrl
        ? {
            lightDevDownload: {
              fileName: "scripture-memo-password-reset.txt",
              content: [
                "Scripture Memo — Light Dev Mode password recovery",
                "",
                "Open the URL below to choose a new password:",
                resetUrl,
                "",
                "This Better Auth link expires in 60 minutes and should not be shared.",
              ].join("\r\n"),
            },
          }
        : undefined,
    };
  } catch {
    // WHY: Password recovery must not expose whether the address exists or
    // reveal provider/configuration details through a public response.
    return {
      success: false,
      message: "Password recovery is unavailable right now. Please try again later.",
    };
  }
}

