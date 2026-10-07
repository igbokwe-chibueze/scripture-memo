"use server";

import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { isAdmin } from "@/lib/permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";
import type { ActionResult } from "@/types/api";
import { vaultRepository } from "@/features/vault/repositories/vault.repository";
import { startVaultReplaySchema } from "@/features/vault/schemas/start-vault-replay.schema";

/** Starts the isolated Vault QA fixture for an authorized administrator. */
export async function startAdminVaultReplayAction(
  input: unknown,
): Promise<ActionResult<{ sessionId: string }>> {
  const parsed = startVaultReplaySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid Vault test request.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await getServerSession();
  if (!session?.user) {
    return { success: false, message: "Authentication required." };
  }
  if (!isAdmin(session.user.role as UserRole | null | undefined)) {
    return { success: false, message: "Administrator access required." };
  }

  try {
    const sessionId = await vaultRepository.startAdminReplay(
      session.user.id,
      parsed.data.verseId,
      new Date(),
    );
    if (!sessionId) {
      return {
        success: false,
        message: "Complete at least one verse before testing Vault replay.",
      };
    }

    return {
      success: true,
      message: "Vault test replay ready.",
      data: { sessionId },
    };
  } catch (error) {
    logger.error("Unable to start administrator Vault replay.", {
      error,
      userId: session.user.id,
      verseId: parsed.data.verseId,
    });
    return { success: false, message: "The Vault test replay could not start." };
  }
}
