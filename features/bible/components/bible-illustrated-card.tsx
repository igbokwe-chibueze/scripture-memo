"use client";

/** Reusable illustrated entry for testament navigation and topic selection.
 * The supplied artwork remains untouched; CSS controls the responsive crop.
 * This uses the approved shared Button so keyboard, bevel and press states
 * stay consistent rather than introducing an independent card-control system.
 */
import Image from "next/image";
import { ChevronRightIcon, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Caption duplicates the image meaning, so decorative artwork has empty alt text. */
export function BibleIllustratedCard({
  title,
  subtitle,
  src,
  onClick,
  className,
  imagePosition = "center",
  compactTitle = false,
  sizes = "(min-width: 1024px) 440px, (min-width: 640px) 45vw, 50vw",
  placeholderLabel,
  presentation = "default",
  badge,
}: {
  title: string;
  subtitle: string;
  src?: string;
  /** Reading plans reuse the approved card while awaiting owner-supplied art. */
  placeholderLabel?: string;
  onClick: () => void;
  className?: string;
  imagePosition?: string;
  /** Testament names must fit beside the decorative arrow on two-column mobile cards. */
  compactTitle?: boolean;
  /** Topic previews span most of a phone; request enough pixels for that wider crop. */
  sizes?: string;
  /** Plan-only centered captions keep approved book/topic cards unchanged. */
  presentation?: "default" | "plan";
  /** Small presentation status, such as a device-only completion percentage. */
  badge?: string;
}): React.ReactNode {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(
        "bible-illustrated-card relative isolate h-auto w-full overflow-hidden whitespace-normal rounded-card p-0 text-left",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          className="object-cover"
          style={{ objectPosition: imagePosition }}
        />
      ) : (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-primary/5 pb-20 text-muted-foreground">
          <ImageIcon aria-hidden="true" className="size-8 text-primary/60" />
          <span className="sr-only">{placeholderLabel}</span>
        </span>
      )}
      <span className="bible-image-shade absolute inset-0" aria-hidden="true" />
      {badge && (
        <span className="absolute right-0 top-0 z-10 rounded-bl-control bg-background/90 px-2 py-1 text-xs font-bold text-foreground">
          {badge}
        </span>
      )}
      <span
        className={cn(
          "bible-image-caption flex w-full items-center gap-2 px-3 py-2 sm:px-4 sm:py-3",
          presentation === "plan"
            ? "absolute left-0 top-1/2 -translate-y-1/2 justify-center text-center"
            : "relative mt-auto justify-between",
        )}
      >
        <span className={cn("min-w-0", presentation === "plan" && "w-full")}>
          <span
            className={cn(
              "block font-heading font-bold leading-tight sm:text-2xl",
              compactTitle ? "text-sm" : "text-lg",
            )}
          >
            {title}
          </span>
          <span className="mt-0.5 block text-xs font-medium leading-snug sm:text-sm">
            {subtitle}
          </span>
        </span>
        {/* Centered plan captions use the full width; an off-centre decorative
            arrow would push their titles away from the card's actual centre. */}
        {presentation !== "plan" && (
          <span
            aria-hidden="true"
            className="grid size-7 shrink-0 place-items-center rounded-full border border-current/40 sm:size-9"
          >
            <ChevronRightIcon className="size-5" />
          </span>
        )}
      </span>
    </Button>
  );
}
