"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { isAdmin } from "@/lib/permissions";
import { getRequestIp } from "@/lib/request-ip";
import type { ActionResult } from "@/types/api";
import { packRepository } from "@/features/packs/repositories/pack.repository";
import { packIdSchema } from "@/features/packs/schemas/pack.schema";

/** Publishes a non-empty pack containing at least one published verse. */
export async function publishPackAction(input: unknown): Promise<ActionResult> {
  const parsed = packIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Invalid pack." };

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) return { success: false, message: "Administrator access is required." };

  try {
    const published = await packRepository.publish(
      parsed.data.id,
      session.user.id,
      getRequestIp(requestHeaders),
    );
    if (!published) return { success: false, message: "Add at least one published verse before publishing this pack." };
    revalidatePath("/admin/packs");
    revalidatePath(`/admin/packs/${parsed.data.id}/edit`);
    return { success: true, message: "Pack published." };
  } catch {
    return { success: false, message: "Unable to publish pack." };
  }
}
