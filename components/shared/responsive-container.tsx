import { cn } from "@/lib/utils";

export type ResponsiveContainerProps = React.ComponentProps<"div"> & {
  /** Content rendered inside the centered responsive width boundary. */
  children: React.ReactNode;
  /** Selects an intentional maximum width for the owning view. */
  size?: "sm" | "md" | "lg" | "xl" | "full";
};

const containerSizes: Record<NonNullable<ResponsiveContainerProps["size"]>, string> = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-none",
};

/**
 * Applies consistent mobile gutters and readable desktop width constraints.
 *
 * Feature views retain ownership of vertical rhythm; this component only solves
 * horizontal layout so nesting it does not introduce unexpected page spacing.
 */
export function ResponsiveContainer({
  size = "lg",
  className,
  children,
  ...props
}: ResponsiveContainerProps): React.ReactNode {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        containerSizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
