"use client";

/** Application Sonner facade. Keep error timing in one place, including older
 * callers that explicitly requested Infinity under the previous project rule.
 * Other Sonner methods, IDs, descriptions and callbacks retain their behavior.
 */
import { toast as sonnerToast, type ExternalToast } from "sonner";

/** Longer than the normal four-second notification, with manual close retained. */
export const ERROR_TOAST_DURATION_MS = 10_000;

/** Callable Sonner API with the owner-approved automatic error dismissal policy. */
export const toast: typeof sonnerToast = Object.assign(
  (
    message: Parameters<typeof sonnerToast>[0],
    data?: ExternalToast,
  ): string | number => sonnerToast(message, data),
  sonnerToast,
  {
    error(
      message: Parameters<typeof sonnerToast.error>[0],
      data?: ExternalToast,
    ): string | number {
      return sonnerToast.error(message, {
        ...data,
        duration: ERROR_TOAST_DURATION_MS,
      });
    },
  },
);
