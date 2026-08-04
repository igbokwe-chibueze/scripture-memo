import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import {
  PASSWORD_RESET_DELIVERY_MODES,
  type PasswordResetDeliveryMode,
} from "@/features/auth/constants/password-reset-delivery";
import { sendProductionPasswordReset } from "@/features/auth/lib/password-reset-production-delivery";
import { logger } from "@/lib/logger";

type ResetLinkCollector = { resetUrl?: string };

const lightDevCollector = new AsyncLocalStorage<ResetLinkCollector>();

/** Returns the configured delivery mode and rejects unsafe production setup. */
export function getPasswordResetDeliveryMode(): PasswordResetDeliveryMode {
  const configured = process.env.PASSWORD_RESET_DELIVERY_MODE?.trim().toUpperCase();
  const mode = configured ??
    (process.env.NODE_ENV === "production"
      ? PASSWORD_RESET_DELIVERY_MODES.PROD
      : PASSWORD_RESET_DELIVERY_MODES.LIGHT_DEV);

  if (mode !== PASSWORD_RESET_DELIVERY_MODES.LIGHT_DEV && mode !== PASSWORD_RESET_DELIVERY_MODES.PROD) {
    throw new Error(
      "PASSWORD_RESET_DELIVERY_MODE must be either LIGHT_DEV or PROD.",
    );
  }

  // WHY: A downloaded reset link exposes a live bearer token to the browser.
  // It is convenient for local testing but must never become a deployment-time
  // substitute for proving control of an email inbox.
  if (mode === PASSWORD_RESET_DELIVERY_MODES.LIGHT_DEV && process.env.NODE_ENV === "production") {
    throw new Error("LIGHT_DEV password-reset delivery is forbidden in production.");
  }

  return mode;
}

/**
 * Captures exactly one Better Auth reset URL inside the current Server Action.
 *
 * AsyncLocalStorage prevents concurrent local requests from receiving one
 * another's links. Nothing is written to disk, cached globally, or persisted.
 */
export async function captureLightDevResetUrl(
  requestReset: () => Promise<void>,
): Promise<string | undefined> {
  const collector: ResetLinkCollector = {};
  await lightDevCollector.run(collector, requestReset);
  return collector.resetUrl;
}

/** Dispatches the Better Auth URL through the selected transport only. */
export async function deliverPasswordReset(
  recipientEmail: string,
  resetUrl: string,
): Promise<void> {
  const mode = getPasswordResetDeliveryMode();

  if (mode === PASSWORD_RESET_DELIVERY_MODES.LIGHT_DEV) {
    const collector = lightDevCollector.getStore();
    if (!collector) {
      // Direct calls to Better Auth's public endpoint intentionally receive no
      // downloadable secret. Only the rate-limited application action creates
      // the request-scoped collector used by Light Dev Mode.
      logger.warn("A Light Dev reset URL was generated outside the recovery action.");
      return;
    }
    collector.resetUrl = resetUrl;
    return;
  }

  // Better Auth recommends that production delivery not extend response timing.
  // The future adapter should hand work to a durable provider before resolving.
  void sendProductionPasswordReset({ recipientEmail, resetUrl }).catch((error: unknown) => {
    logger.error("Production password-reset delivery failed.", { error });
  });
}

