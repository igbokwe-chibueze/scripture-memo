"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/types/api";
import { authRepository } from "@/features/auth/repositories/auth.repository";
import { registerSchema } from "@/features/auth/schemas/register.schema";

type RegisterResult = { redirectTo: "/select-translation" };

/** Creates a Better Auth identity and the application-owned player foundation. */
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
    const result = await auth.api.signUpEmail({
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
      },
      headers: requestHeaders,
    });

    await authRepository.ensureUserFoundation(result.user.id, result.user.name);

    return {
      success: true,
      message: "Account created successfully.",
      data: { redirectTo: "/select-translation" },
    };
  } catch {
    return {
      success: false,
      message: "We could not create that account. Try logging in instead.",
    };
  }
}
