"use server";

import { fellowshipGovernanceRepository } from "@/features/fellowships/repositories/fellowship-governance.repository";
import { fellowshipModerationDetailSchema } from "@/features/fellowships/schemas/fellowship-governance.schema";
import type { FellowshipModerationItem } from "@/features/fellowships/types/fellowship.types";
import { getServerSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";
import type { ActionResult } from "@/types/api";

/** Loads the management overview for Super Admins without exposing moderation data to general admins. */
export async function getFellowshipModerationDetailAction(
  input: unknown,
): Promise<ActionResult<FellowshipModerationItem>> {
  const parsed = fellowshipModerationDetailSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Select a valid Fellowship." };
  }

  const session = await getServerSession();
  if (!session?.user) {
    return { success: false, message: "Authentication required." };
  }
  if (!isSuperAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Insufficient permissions." };
  }

  const fellowship = await fellowshipGovernanceRepository.getModerationDetail(
    parsed.data.fellowshipId,
  );
  if (!fellowship) {
    return { success: false, message: "Fellowship not found." };
  }

  return {
    success: true,
    message: "Fellowship details loaded.",
    data: fellowship,
  };
}
