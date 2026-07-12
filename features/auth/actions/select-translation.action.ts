"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import type { TranslationCode } from "@/lib/generated/prisma/enums";
import type { ActionResult } from "@/types/api";
import { authRepository } from "@/features/auth/repositories/auth.repository";
import { selectTranslationSchema } from "@/features/auth/schemas/select-translation.schema";

/** Saves the authenticated player's one-time Bible translation selection. */
export async function selectTranslationAction(
  input: unknown,
): Promise<ActionResult<{ redirectTo: "/game" }>> {
  const parsed = selectTranslationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Select a Bible translation.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { success: false, message: "Authentication required." };
  }

  try {
    await authRepository.selectTranslation(
      session.user.id,
      parsed.data.translation as TranslationCode,
    );
  } catch {
    // WHY: A handled result always settles the client transition and produces
    // visible feedback instead of leaving the submit button pending when the
    // database is temporarily unavailable.
    return {
      success: false,
      message: "Unable to save your Bible translation. Please try again.",
    };
  }

  return {
    success: true,
    message: "Bible translation saved.",
    data: { redirectTo: "/game" },
  };
}
