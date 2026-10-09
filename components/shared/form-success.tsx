import { CircleCheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type FormSuccessProps = {
  /** Confirmation text describing the completed outcome. */
  message?: string | null;
  /** Extends placement or sizing while retaining shared status semantics. */
  className?: string;
};

/**
 * Announces successful form completion inline for persistent local context.
 *
 * Sonner remains the global feedback system, but an inline status ensures users
 * who miss a transient toast can still understand the form's completed state.
 */
export function FormSuccess({
  message,
  className,
}: FormSuccessProps): React.ReactNode {
  if (!message) return null;

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-card border border-success-border bg-success-subtle p-3 text-sm text-success-text",
        className,
      )}
    >
      <CircleCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
