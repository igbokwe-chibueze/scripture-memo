"use client";

import { Share2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ShareAchievementButtonProps = {
  /** Native share-sheet title; clipboard fallback copies only safe public copy. */
  title: string;
  /** Achievement summary intentionally contains no private learner data. */
  text: string;
  /** Short visible label keeps paired celebration actions compact on mobile. */
  label?: string;
  /** Allows each celebration palette to style the shared secondary action. */
  className?: string;
};

/**
 * Shares a public achievement through the platform sheet with clipboard fallback.
 *
 * The current origin is appended so copied messages remain useful outside the
 * app. User-cancelled native share sheets are silent; operational failures use
 * the mandatory persistent Sonner error treatment.
 */
export function ShareAchievementButton({
  title,
  text,
  label = "Share",
  className,
}: ShareAchievementButtonProps): React.ReactNode {
  const shareAchievement = async (): Promise<void> => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: window.location.origin });
        return;
      }

      await navigator.clipboard.writeText(`${text} ${window.location.origin}`);
      toast.success("Achievement message copied.", { duration: 4_000 });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Unable to share this achievement.", { duration: Infinity });
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("min-h-12 shrink-0 rounded-xl px-4 font-bold", className)}
      onClick={() => void shareAchievement()}
    >
      <Share2Icon data-icon="inline-start" aria-hidden="true" />
      {label}
    </Button>
  );
}
