"use server";

import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import { vaultRepository } from "@/features/vault/repositories/vault.repository";
import { startVaultReplaySchema } from "@/features/vault/schemas/start-vault-replay.schema";

/** Creates an isolated replay only after repository-owned mastery verification. */
export async function startVaultReplayAction(
  input: unknown,
): Promise<ActionResult<{ sessionId: string }>> {
  const parsed = startVaultReplaySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid Vault replay request.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const session = await getServerSession();
  if (!session?.user) {
    return { success: false, message: "Authentication required." };
  }

  try {
    const sessionId = await vaultRepository.startReplay(
      session.user.id,
      parsed.data.verseId,
      new Date(),
    );
    if (!sessionId) {
      return {
        success: false,
        message: "Complete every Journey Stage before replaying this verse.",
      };
    }
    return {
      success: true,
      message: "Vault replay ready.",
      data: { sessionId },
    };
  } catch (error) {
    logger.error("Unable to start Vault replay.", {
      error,
      userId: session.user.id,
      verseId: parsed.data.verseId,
    });
    return { success: false, message: "The Vault replay could not be started." };
  }
}
