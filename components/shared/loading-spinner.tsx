import { LoaderCircleIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const spinnerSizes = {
  sm: "size-4",
  md: "size-6",
  lg: "size-10",
} as const;

export type LoadingSpinnerProps = {
  /** Controls the spinner dimensions; `md` is suitable for most inline states. */
  size?: keyof typeof spinnerSizes;
  /** Supplies an accessible progress label without displaying duplicate text. */
  label?: string;
  /** Extends the wrapper when a feature needs contextual spacing or color. */
  className?: string;
};

/**
 * Communicates indeterminate progress in both visual and assistive formats.
 *
 * The icon is hidden from assistive technology because the wrapper's status
 * role and label provide a stable, non-repetitive announcement. Motion follows
 * the user's reduced-motion preference so loading never becomes distracting.
 */
export function LoadingSpinner({
  size = "md",
  label = "Loading",
  className,
}: LoadingSpinnerProps): React.ReactNode {
  return (
    <span
      role="status"
      className={cn("inline-flex items-center justify-center", className)}
    >
      <LoaderCircleIcon
        className={cn("animate-spin motion-reduce:animate-none", spinnerSizes[size])}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
