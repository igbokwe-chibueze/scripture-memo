"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [isPending, startNavigation] = useTransition();

  return (
    <Link
      {...props}
      data-slot="button"
      aria-busy={isPending}
      // WHY: Navigation differs from Button only semantically. Passing all
      // visual inputs through the exact Button merge path guarantees identical
      // color, bevel, hover, press, focus, and reduced-motion behavior.
      className={cn(buttonVariants({ variant, size, className }))}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        if (isPending) {
          event.preventDefault();
          return;
        }

        // Clicking the already-active destination does not produce a route
        // change, so no completion signal would follow. Keep the button idle.
        const destination = new URL(event.currentTarget.href);
        const currentLocation = new URL(window.location.href);
        if (
          destination.pathname === currentLocation.pathname &&
          destination.search === currentLocation.search &&
          destination.hash === currentLocation.hash
        ) {
          event.preventDefault();
          return;
        }

        // External destinations retain the browser's native navigation. For an
        // internal destination, React owns the transition and clears pending
        // only after Next.js commits the pathname or query-string update.
        if (destination.origin !== currentLocation.origin) return;

        event.preventDefault();
        startNavigation(() => {
          router.push(
            `${destination.pathname}${destination.search}${destination.hash}`,
          );
        });
      }}
    >
      {isPending ? (
        <>
          <LoadingSpinner size="sm" label={pendingLabel} />
          <span>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </Link>
  );
}

