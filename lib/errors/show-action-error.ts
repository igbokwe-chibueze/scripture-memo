"use client";

import { toast } from "sonner";
import type { ActionResult } from "@/types/api";

type ActionFailure = Extract<ActionResult<unknown>, { success: false }>;

/** Presents a safe action failure consistently without crowding the toast. */
export function showActionError(result: ActionFailure): void {
  toast.error(result.message, {
    description: result.errorCode ? `Error code: ${result.errorCode}` : undefined,
    duration: Infinity,
  });
}
