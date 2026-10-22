"use server";

/** Authenticated social mutation boundary; recipients and request direction are server-checked. */
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getServerSession } from "@/lib/auth/session";
import { PlayerSocialConflictError } from "@/lib/errors/player-social-error";
import type { ActionResult } from "@/types/api";
import { friendMutationSchema } from "../schemas/friend.schema";
import { friendRepository } from "../repositories/friend.repository";

/** Explicitly requested operations are atomic; opening a profile never changes the graph. */
export async function updateFriendshipAction(input: unknown): Promise<ActionResult> {
  const parsed = friendMutationSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Select a valid player and action." };
  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };
  const t = await getTranslations("PlayerSocial");
  try {
    await friendRepository.mutate(session.user.id, parsed.data.publicId, parsed.data.operation);
    revalidatePath("/friends");
    revalidatePath("/profiles", "layout");
    revalidatePath("/", "layout");
    return { success: true, message: t(`success.${parsed.data.operation}`) };
  } catch (error) {
    if (error instanceof PlayerSocialConflictError) {
      return { success: false, message: t(`errors.${error.reason}`) };
    }
    return { success: false, message: t("errors.failed"), errorCode: "SOC-001" };
  }
}
