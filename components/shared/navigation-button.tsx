"use client";

import { useState } from "react";
import Link from "next/link";
import type { VariantProps } from "class-variance-authority";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NavigationButtonProps = Omit<React.ComponentProps<typeof Link>, "className"> &
  VariantProps<typeof buttonVariants> & {
    /** Required visible copy keeps every navigation action's pending state intentional. */
    pendingLabel: string;
    className?: string;
  };

/**
 * Button-styled link with immediate feedback from tap until route replacement.
 *
 * Next.js route loading UI can appear only after navigation begins. Local click
 * state closes that perception gap while preserving Link prefetching, modifier-
 * key behavior, and semantic navigation. The required pending label prevents a
 * caller from accidentally shipping a silent route-changing button.
 */
export function NavigationButton({
  children,
  pendingLabel,
  variant,
  size,
  className,
  onClick,
  ...props
}: NavigationButtonProps): React.ReactNode {
  const [isPending, setIsPending] = useState(false);

  return (
    <Link
      {...props}
      aria-busy={isPending}
      className={cn(buttonVariants({ variant, size }), className)}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (isPending) {
          event.preventDefault();
          return;
        }
        setIsPending(true);
      }}
    >
      {isPending ? <><LoadingSpinner size="sm" label={pendingLabel} /><span>{pendingLabel}</span></> : children}
    </Link>
  );
}

