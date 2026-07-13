"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { isAdmin } from "@/lib/permissions";
import { getRequestIp } from "@/lib/request-ip";
import type { ActionResult } from "@/types/api";
import { toPackWriteData } from "@/features/packs/lib/to-pack-write-data";
import { packRepository } from "@/features/packs/repositories/pack.repository";
import { packFormSchema } from "@/features/packs/schemas/pack.schema";

/** Updates pack metadata after validation and ADMIN authorization. */
export async function updatePackAction(input: unknown): Promise<ActionResult> {
  const parsed = packFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Check the highlighted pack fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  if (!parsed.data.id) return { success: false, message: "Pack ID is required." };

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) return { success: false, message: "Administrator access is required." };

  try {
    await packRepository.update(
      parsed.data.id,
      toPackWriteData(parsed.data),
      session.user.id,
      getRequestIp(requestHeaders),
    );
    revalidatePath("/admin/packs");
    revalidatePath(`/admin/packs/${parsed.data.id}/edit`);
    return { success: true, message: "Pack details updated." };
  } catch {
    return { success: false, message: "Unable to update pack. Choose a unique name." };
  }
}
