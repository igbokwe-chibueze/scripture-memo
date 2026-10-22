"use client";

import { toast } from "sonner";
import type { ActionResult } from "@/types/api";

type ActionFailure = Extract<ActionResult<unknown>, { success: false }>;

/** Presents a safe action failure consistently without crowding the toast. */
export function showActionError(result: ActionFailure, toastId?: string): void {
  toast.error(result.message, {
    // A stable caller ID replaces an existing failure during retries instead
    // of stacking persistent copies. Other callers keep their current behavior.
    id: toastId,
    description: result.errorCode
      ? `Error code: ${result.errorCode}`
      : undefined,
    duration: Infinity,
  });
}
