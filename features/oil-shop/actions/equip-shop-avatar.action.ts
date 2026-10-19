"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import { equipShopAvatarSchema } from "../schemas/equip-shop-avatar.schema";
import { oilShopRepository, OilShopConflictError } from "../repositories/oil-shop.repository";

/** Validate before auth; the repository independently verifies permanent ownership. */
export async function equipShopAvatarAction(input: unknown): Promise<ActionResult> {
  const parsed = equipShopAvatarSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Choose a valid avatar." };
  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };

  try {
    await oilShopRepository.equipAvatar(session.user.id, parsed.data.avatarKey);
    revalidatePath("/", "layout");
    return { success: true, message: "Avatar equipped." };
  } catch (error) {
    if (error instanceof OilShopConflictError) {
      return {
        success: false,
        message: "Purchase this avatar before equipping it.",
        errorCode: "SHP-003",
      };
    }
    logger.error("Avatar equip failed.", { error, userId: session.user.id });
    return {
      success: false,
      message: "The avatar could not be equipped. Please try again.",
      errorCode: "SHP-002",
    };
  }
}
