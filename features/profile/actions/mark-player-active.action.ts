"use server";

import { getSessionFromHeaders } from "@/lib/auth/get-session-from-headers";
import { headers } from "next/headers";
import { profilePresenceRepository } from "@/features/profile/repositories/profile-presence.repository";

/** Records authenticated activity without accepting client identity or time. */
export async function markPlayerActiveAction(): Promise<void> {
  const session = await getSessionFromHeaders(await headers() );
  if (!session?.user) return;

  // Server time prevents a modified client clock from extending online state.
  await profilePresenceRepository.markActive(session.user.id, new Date());
}

