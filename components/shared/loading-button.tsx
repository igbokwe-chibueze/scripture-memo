import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { cn } from "@/lib/utils";

export type LoadingButtonProps = React.ComponentProps<typeof Button> & {
  /** Replaces the leading content with progress feedback and prevents input. */
  isPending?: boolean;
  /** Overrides the accessible pending announcement for the current operation. */
  pendingLabel?: string;
};

/**
 * Prevents duplicate submissions while giving immediate tactile-style feedback.
 *
 * Both `disabled` and `aria-disabled` are set during pending work because visual
 * dimming alone does not prevent rapid taps or communicate state to assistive
 * technology. Existing disabled intent is preserved when work is not pending.
 */
export function LoadingButton({
  isPending = false,
  pendingLabel = "Please wait",
  disabled,
  children,
  className,
  ...props
}: LoadingButtonProps): React.ReactNode {
  const isDisabled = disabled || isPending;

  return (
    <Button
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={isPending}
      className={cn("min-h-11", className)}
      {...props}
    >
      {isPending ? (
        <>
          <LoadingSpinner size="sm" label={pendingLabel} />
          <span>{pendingLabel}</span>
        </>
      ) : (
        // Preserve normal Button child composition so leading icons remain
        // direct flex items beside their label instead of stacking inside a
        // text wrapper. Pending content stays explicit and accessible above.
        children
      )}
    </Button>
  );
}
