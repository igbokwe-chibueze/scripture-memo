import { CircleAlertIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type FormErrorProps = {
  /** Error text returned by validation or a safe server action response. */
  message?: string | null;
  /** Extends placement or sizing without weakening the shared alert semantics. */
  className?: string;
};

/**
 * Announces a form-level failure without exposing raw exceptions or internals.
 *
 * Returning null for an absent message keeps forms free of empty alert regions,
 * which would otherwise create confusing screen-reader announcements.
 */
export function FormError({ message, className }: FormErrorProps): React.ReactNode {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive",
        className,
      )}
    >
      <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
