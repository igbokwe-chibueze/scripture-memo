"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import { authRepository } from "@/features/auth/repositories/auth.repository";
import { loginSchema } from "@/features/auth/schemas/login.schema";
import { getSafePostLoginPath } from "@/features/auth/lib/get-safe-post-login-path";
import { progressionRepository } from "@/features/progression/repositories/progression.repository";

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
    const isSuspended = await authRepository.isLoginSuspended(
      parsed.data.email,
      new Date(),
    );
    if (isSuspended) {
      // WHY: Use the same safe response as invalid credentials. Public login
      // must not reveal whether an email exists or whether it is suspended.
      return {
        success: false,
        message: "Email or password is incorrect.",
      };
    }

    const result = await auth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
      },
      headers: requestHeaders,
    });

    await authRepository.ensureUserFoundation(result.user.id, result.user.name);
    // WHY: Login is a safe repair point for identities created before the
    // progression engine existed. The repository is idempotent and never
    // pre-creates records for locked or future waypoints.
    await progressionRepository.initializeFirstWaypoint(result.user.id).catch((error: unknown) => {
      // WHY: A temporary progression failure must not be misreported as invalid
      // credentials after Better Auth has already created a valid session. The
      // game entry action can safely retry this idempotent initialization.
      logger.error("Progression initialization failed after login.", {
        error,
        userId: result.user.id,
      });
    });
    const hasSelectedTranslation =
      await authRepository.hasSelectedTranslation(result.user.id);
    const safeNextPath = getSafePostLoginPath(parsed.data.nextPath);

    return {
      success: true,
      message: "Welcome back!",
      data: {
        // WHY: Translation onboarding always takes precedence. Returning users
        // resume only a validated internal destination from the login URL.
        redirectTo: hasSelectedTranslation
          ? safeNextPath
          : `/select-translation?next=${encodeURIComponent(safeNextPath)}`,
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
