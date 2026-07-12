"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import type { ActionResult } from "@/types/api";

/** Invalidates the current Better Auth session on the server. */
export async function logoutAction(): Promise<ActionResult> {
  try {
    await auth.api.signOut({ headers: await headers() });
    return { success: true, message: "You have been logged out." };
  } catch {
    return { success: false, message: "Unable to log out. Please try again." };
  }
}
