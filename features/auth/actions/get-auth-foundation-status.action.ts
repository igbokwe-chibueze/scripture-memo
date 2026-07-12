"use server";

import type { ActionResult } from "@/types/api";

type AuthFoundationStatus = {
  actionContractReady: true;
};

/**
 * Demonstrates the shared Server Action response contract for the auth feature.
 *
 * This action intentionally performs no mutation and exposes no private data. It
 * exists only to satisfy the Phase 4 foundation acceptance criterion without
 * prematurely implementing Phase 5 registration or login behavior. It should be
 * removed when the first real auth action adopts `ActionResult`.
 */
export async function getAuthFoundationStatusAction(): Promise<
  ActionResult<AuthFoundationStatus>
> {
  return {
    success: true,
    message: "The authentication action contract is ready.",
    data: { actionContractReady: true },
  };
}
