import { cn } from "@/lib/utils"

/**
 * Shared skeleton placeholder generated from the current shadcn registry.
 * It forwards native div props and className and is intentionally presentational;
 * owning views must provide surrounding labels when loading requires announcement.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
