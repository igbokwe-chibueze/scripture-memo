"use server";

import type { UserRole } from "@/lib/generated/prisma/enums";
import { getServerSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import { adminRepository } from "@/features/admin/repositories/admin.repository";
import { userEmailSuggestionSchema } from "@/features/admin/schemas/manage-user.schema";

type UserEmailSuggestions = {
  suggestions: string[];
};

/** Returns a bounded predictive email list to an authenticated Super Admin. */
export async function searchUserEmailsAction(
  input: unknown,
): Promise<ActionResult<UserEmailSuggestions>> {
  const parsed = userEmailSuggestionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Enter at least three characters to find an account.",
    };
  }

  const session = await getServerSession();
  if (!session?.user) {
    return { success: false, message: "Authentication required." };
  }
  if (!isSuperAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Super Admin access is required." };
  }

  try {
    const suggestions = await adminRepository.findUserEmailSuggestions(
      parsed.data.query,
    );
    return {
      success: true,
      message: "Matching accounts loaded.",
      data: { suggestions },
    };
  } catch (error) {
    logger.error("Unable to load account email suggestions.", {
      error,
      actorId: session.user.id,
    });
    return {
      success: false,
      message: "Email suggestions could not be loaded.",
    };
  }
}
