"use server";

/** Handle claims never accept a client account ID or trust availability checks. */
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getServerSession } from "@/lib/auth/session";
import { PlayerSocialConflictError } from "@/lib/errors/player-social-error";
import type { ActionResult } from "@/types/api";
import { updateUsernameSchema } from "../schemas/username.schema";
import { playerProfileRepository } from "../repositories/player-profile.repository";

/** Validate before auth, then let the unique database index resolve competing claims. */
export async function updateUsernameAction(input: unknown): Promise<ActionResult> {
  const parsed = updateUsernameSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Use 3–24 letters, numbers or underscores." };
  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };
  const t = await getTranslations("PlayerSocial");
  try {
    await playerProfileRepository.updateUsername(session.user.id, parsed.data.username);
    revalidatePath("/profiles", "layout");
    revalidatePath("/friends");
    return { success: true, message: t("usernameSaved") };
  } catch (error) {
    if (error instanceof PlayerSocialConflictError) {
      return { success: false, message: t(`errors.${error.reason}`) };
    }
    return { success: false, message: t("errors.failed"), errorCode: "SOC-001" };
  }
}
