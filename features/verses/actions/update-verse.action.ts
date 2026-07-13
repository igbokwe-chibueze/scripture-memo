"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/permissions";
import { getRequestIp } from "@/lib/request-ip";
import type { UserRole } from "@/lib/generated/prisma/enums";
import type { ActionResult } from "@/types/api";
import { verseRepository } from "@/features/verses/repositories/verse.repository";
import { verseFormSchema } from "@/features/verses/schemas/verse.schema";
import { toVerseWriteData } from "@/features/verses/lib/to-verse-write-data";

/** Updates a verse, tags, and all translations after ADMIN authorization. */
export async function updateVerseAction(input: unknown): Promise<ActionResult> {
  const parsed = verseFormSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Check the highlighted verse fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  if (!parsed.data.id) return { success: false, message: "Verse ID is required." };

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) return { success: false, message: "Administrator access is required." };

  try {
    await verseRepository.update(
      parsed.data.id,
      toVerseWriteData(parsed.data),
      session.user.id,
      getRequestIp(requestHeaders),
    );
    revalidatePath("/admin/verses");
    revalidatePath(`/admin/verses/${parsed.data.id}/edit`);
    return { success: true, message: "Verse updated." };
  } catch {
    return { success: false, message: "Unable to update verse." };
  }
}
