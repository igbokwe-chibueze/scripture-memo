"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { isAdmin } from "@/lib/permissions";
import { getRequestIp } from "@/lib/request-ip";
import type { ActionResult } from "@/types/api";
import { packRepository } from "@/features/packs/repositories/pack.repository";
import { packVerseSchema } from "@/features/packs/schemas/pack.schema";

/** Removes one verse and automatically hides a pack that becomes empty. */
export async function removeVerseFromPackAction(input: unknown): Promise<ActionResult> {
  const parsed = packVerseSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Invalid pack verse." };

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) return { success: false, message: "Administrator access is required." };

  try {
    const result = await packRepository.removeVerse(
      parsed.data.packId,
      parsed.data.verseId,
      session.user.id,
      getRequestIp(requestHeaders),
    );
    if (!result.removed) return { success: false, message: "Verse is not in this pack." };
    revalidatePath(`/admin/packs/${parsed.data.packId}/edit`);
    revalidatePath("/admin/packs");
    return {
      success: true,
      message: result.autoHidden
        ? "Verse removed. The empty pack was hidden automatically."
        : "Verse removed from pack.",
    };
  } catch {
    return { success: false, message: "Unable to remove this verse." };
  }
}
