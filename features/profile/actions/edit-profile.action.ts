"use server";

/** One authenticated save owns all profile-dialog changes; no client identity is trusted. */
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getServerSession } from "@/lib/auth/session";
import { PlayerSocialConflictError } from "@/lib/errors/player-social-error";
import type { ActionResult } from "@/types/api";
import { editProfileSchema } from "../schemas/edit-profile.schema";
import { playerProfileRepository } from "../repositories/player-profile.repository";

/** Validate, authenticate, and delegate eligibility/ownership/cooldown checks to the transaction. */
export async function editProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = editProfileSchema.safeParse(input);
  const t = await getTranslations("PlayerSocial");
  if (!parsed.success)
    return {
      success: false,
      message: t("profileCheck"),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  const session = await getServerSession();
  if (!session?.user)
    return { success: false, message: t("errors.unavailable") };
  try {
    await playerProfileRepository.editProfile(session.user.id, parsed.data);
    revalidatePath("/", "layout");
    return { success: true, message: t("profileSaved") };
  } catch (error) {
    if (error instanceof PlayerSocialConflictError)
      return { success: false, message: t(`errors.${error.reason}`) };
    return {
      success: false,
      message: t("errors.failed"),
      errorCode: "SOC-001",
    };
  }
}
