import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex touch-manipulation shrink-0 items-center justify-center rounded-control border border-transparent bg-clip-padding font-action text-sm font-bold whitespace-nowrap shadow-[0_4px_0_var(--control-edge),0_8px_14px_color-mix(in_oklch,var(--foreground),transparent_84%)] transition-all duration-150 outline-none select-none hover:-translate-y-px hover:shadow-[0_5px_0_var(--control-edge),0_11px_18px_color-mix(in_oklch,var(--foreground),transparent_82%)] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring active:translate-y-[3px] active:scale-[0.97] active:duration-75 active:shadow-[0_1px_0_var(--control-edge),0_3px_6px_color-mix(in_oklch,var(--foreground),transparent_84%)] disabled:pointer-events-none disabled:translate-y-0 disabled:scale-100 disabled:opacity-50 disabled:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:translate-y-0 motion-reduce:active:scale-100 aria-invalid:border-error-border aria-invalid:ring-3 aria-invalid:ring-error/20 dark:disabled:shadow-none dark:aria-invalid:border-error-border dark:aria-invalid:ring-error/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "shadow-none hover:bg-muted hover:text-foreground hover:shadow-sm active:translate-y-px active:scale-[0.99] active:shadow-none aria-expanded:bg-muted aria-expanded:text-foreground dark:shadow-none dark:hover:bg-muted/50 dark:hover:shadow-sm dark:active:shadow-none",
        destructive:
          "bg-error-subtle text-error-text border-error-border hover:bg-error-subtle focus-visible:border-error-border focus-visible:ring-error/20",
        link:
          "text-primary shadow-none underline-offset-4 hover:translate-y-0 hover:shadow-none hover:underline active:translate-y-0 active:scale-100 active:shadow-none dark:shadow-none dark:hover:shadow-none dark:active:shadow-none",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * Shared button primitive generated from the current shadcn Base UI registry.
 * Button forwards accessible Base UI button props and accepts className plus the
 * visual variant and size options declared in buttonVariants.
 */
function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
