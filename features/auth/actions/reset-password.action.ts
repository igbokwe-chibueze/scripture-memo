"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { getRequestIp } from "@/lib/request-ip";
import { authRepository } from "@/features/auth/repositories/auth.repository";
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
  try {
    const withinLimit = await authRepository.consumeAuthActionRateLimit(
      "passwordResetComplete",
      getRequestIp(requestHeaders),
      new Date(),
    );

    if (!withinLimit) {
      return {
        success: false,
        message: "Too many reset attempts. Please try again later.",
      };
    }

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

