"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/types/api";
import { resetPasswordSchema } from "@/features/auth/schemas/reset-password.schema";

type ResetPasswordResult = { redirectTo: "/login" };

/** Validates and submits a Better Auth password-reset token. */
export async function resetPasswordAction(
  input: unknown,
): Promise<ActionResult<ResetPasswordResult>> {
  const parsed = resetPasswordSchema.safeParse(input);
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
    key: `password-reset-complete:${forwardedFor.split(",").at(-1)?.trim()}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });

  if (!limit.success) {
    return {
      success: false,
      message: "Too many reset attempts. Please try again later.",
    };
  }

  try {
    await auth.api.resetPassword({
      body: {
        token: parsed.data.token,
        newPassword: parsed.data.password,
      },
      headers: requestHeaders,
    });

    return {
      success: true,
      message: "Password updated. You can log in now.",
      data: { redirectTo: "/login" },
    };
  } catch {
    return {
      success: false,
      message: "This reset link is invalid or has expired. Request a new one.",
    };
  }
}

