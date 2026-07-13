"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { isAdmin } from "@/lib/permissions";
import { getRequestIp } from "@/lib/request-ip";
import type { ActionResult } from "@/types/api";
import { packRepository } from "@/features/packs/repositories/pack.repository";
import { reorderPackVersesSchema } from "@/features/packs/schemas/pack.schema";

/** Persists the complete server-verified verse ordering for one pack. */
export async function reorderPackVersesAction(input: unknown): Promise<ActionResult> {
  const parsed = reorderPackVersesSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Invalid verse order." };

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) return { success: false, message: "Administrator access is required." };

  try {
    const reordered = await packRepository.reorderVerses(
      parsed.data.packId,
      parsed.data.orderedVerseIds,
      session.user.id,
      getRequestIp(requestHeaders),
    );
    if (!reordered) return { success: false, message: "Pack contents changed. Refresh and try again." };
    revalidatePath(`/admin/packs/${parsed.data.packId}/edit`);
    return { success: true, message: "Verse order saved." };
  } catch {
    return { success: false, message: "Unable to save verse order." };
  }
}
