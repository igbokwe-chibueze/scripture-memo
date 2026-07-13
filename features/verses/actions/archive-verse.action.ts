"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/permissions";
import { getRequestIp } from "@/lib/request-ip";
import type { UserRole } from "@/lib/generated/prisma/enums";
import type { ActionResult } from "@/types/api";
import { verseRepository } from "@/features/verses/repositories/verse.repository";
import { verseIdSchema } from "@/features/verses/schemas/verse.schema";

/** Archives a verse without deleting content or user-linked history. */
export async function archiveVerseAction(input: unknown): Promise<ActionResult> {
  const parsed = verseIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Invalid verse." };
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) return { success: false, message: "Administrator access is required." };
  try {
    await verseRepository.archive(
      parsed.data.id,
      session.user.id,
      getRequestIp(requestHeaders),
    );
    revalidatePath("/admin/verses");
    return { success: true, message: "Verse archived." };
  } catch {
    return { success: false, message: "Unable to archive verse." };
  }
}
