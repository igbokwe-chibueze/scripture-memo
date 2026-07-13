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

/** Creates a verse and all three normalized translations for an administrator. */
export async function createVerseAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = verseFormSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Check the highlighted verse fields.", fieldErrors: parsed.error.flatten().fieldErrors };

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) return { success: false, message: "Administrator access is required." };

  try {
    const verse = await verseRepository.create(
      toVerseWriteData(parsed.data),
      session.user.id,
      getRequestIp(requestHeaders),
    );
    revalidatePath("/admin/verses");
    return { success: true, message: "Verse created.", data: { id: verse.id } };
  } catch {
    return { success: false, message: "Unable to create verse. Check that the reference is unique." };
  }
}
