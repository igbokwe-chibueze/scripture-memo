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

/** Appends one published verse to a pack after ADMIN authorization. */
export async function addVerseToPackAction(input: unknown): Promise<ActionResult> {
  const parsed = packVerseSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Select a valid pack and verse." };

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) return { success: false, message: "Administrator access is required." };

  try {
    const result = await packRepository.addVerse(
      parsed.data.packId,
      parsed.data.verseId,
      session.user.id,
      getRequestIp(requestHeaders),
    );
    if (result === "duplicate") return { success: false, message: "This verse is already in the pack." };
    if (result === "unavailable") return { success: false, message: "Only published verses can be added." };
    revalidatePath(`/admin/packs/${parsed.data.packId}/edit`);
    revalidatePath("/admin/packs");
    return { success: true, message: "Verse added to pack." };
  } catch {
    return { success: false, message: "Unable to add this verse." };
  }
}
