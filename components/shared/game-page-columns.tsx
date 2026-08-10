"use client";

import { createPortal } from "react-dom";
import { useDesktopContextRail } from "@/components/shared/desktop-context-rail";
import { cn } from "@/lib/utils";

type GamePageColumnsProps = {
  /** The route's primary, task-focused content. */
  children: React.ReactNode;
  /** Optional route-specific information shown only when desktop width permits. */
  contextPanel?: React.ReactNode;
  /** Additional classes for feature-owned spacing adjustments. */
  className?: string;
};

/**
 * Connects a page's primary content to the shell-owned desktop context rail.
 *
 * WHY: Mobile must preserve one focused column, while large screens can use the
 * otherwise empty right side for helpful route-specific information. The
 * shell owns the rail and persistent Partner card; this component only portals
 * feature content into the upper slot. Mobile receives no duplicate content.
 */
export function GamePageColumns({
  children,
  contextPanel,
  className,
}: GamePageColumnsProps): React.ReactNode {
  const rail = useDesktopContextRail();

  return (
    <div className={cn("min-w-0", className)}>
      {children}
      {contextPanel && rail?.contextTarget
        ? createPortal(contextPanel, rail.contextTarget)
        : null}
    </div>
  );
}
