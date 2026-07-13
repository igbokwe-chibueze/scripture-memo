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

/** Creates one hidden pack after validation and ADMIN authorization. */
export async function createPackAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = packFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Check the highlighted pack fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) return { success: false, message: "Administrator access is required." };

  try {
    const pack = await packRepository.create(
      toPackWriteData(parsed.data),
      session.user.id,
      getRequestIp(requestHeaders),
    );
    revalidatePath("/admin/packs");
    return { success: true, message: "Pack created as hidden.", data: { id: pack.id } };
  } catch {
    return { success: false, message: "Unable to create pack. Choose a unique name." };
  }
}
