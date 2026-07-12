"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/types/api";
import { authRepository } from "@/features/auth/repositories/auth.repository";
import { loginSchema } from "@/features/auth/schemas/login.schema";
import { getSafePostLoginPath } from "@/features/auth/lib/get-safe-post-login-path";

type LoginResult = { redirectTo: string };

/** Validates credentials, creates a session, and determines onboarding redirect. */
export async function loginAction(input: unknown): Promise<ActionResult<LoginResult>> {
  const parsed = loginSchema.safeParse(input);
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
    key: `login:${forwardedFor.split(",").at(-1)?.trim()}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });

  if (!limit.success) {
    return {
      success: false,
      message: "Too many login attempts. Please try again later.",
    };
  }

  try {
    const result = await auth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
      },
      headers: requestHeaders,
    });

    await authRepository.ensureUserFoundation(result.user.id, result.user.name);
    const hasSelectedTranslation =
      await authRepository.hasSelectedTranslation(result.user.id);

    return {
      success: true,
      message: "Welcome back!",
      data: {
        // WHY: Translation onboarding always takes precedence. Returning users
        // resume only a validated internal destination from the login URL.
        redirectTo: hasSelectedTranslation
          ? getSafePostLoginPath(parsed.data.nextPath)
          : "/select-translation",
      },
    };
  } catch {
    // WHY: A generic response prevents attackers from learning whether an email
    // exists while still giving legitimate users a clear recovery path.
    return {
      success: false,
      message: "Email or password is incorrect.",
    };
  }
}
