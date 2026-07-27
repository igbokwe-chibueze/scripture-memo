"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const HINT_DISPLAY_SECONDS = 6;

/** Calm reference dialog containing only the persisted session translation. */
export function HintModal({
  open,
  reference,
  verseText,
  onOpenChange,
}: {
  open: boolean;
  reference: string;
  verseText: string;
  onOpenChange: (open: boolean) => void;
}): React.ReactNode {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const closeTimer = window.setTimeout(
      () => onOpenChange(false),
      HINT_DISPLAY_SECONDS * 1_000,
    );

    return () => {
      window.clearTimeout(closeTimer);
    };
  }, [onOpenChange, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-[2rem] border-amber-300/40 bg-linear-to-br from-amber-50 via-popover to-violet-50 p-6 pt-8 dark:from-amber-950 dark:via-slate-900 dark:to-violet-950 sm:max-w-lg sm:p-8 sm:pt-10">
        <div
          className="absolute inset-x-0 top-0 h-2 overflow-hidden bg-amber-100 dark:bg-slate-800"
          aria-hidden="true"
        >
          {open && (
            <motion.div
              key="hint-close-progress"
              className="h-full origin-left bg-linear-to-r from-amber-400 to-violet-500"
              initial={{ scaleX: shouldReduceMotion ? 1 : 0 }}
              animate={{ scaleX: 1 }}
              transition={{
                duration: shouldReduceMotion ? 0 : HINT_DISPLAY_SECONDS,
                ease: "linear",
              }}
            />
          )}
        </div>
        <DialogHeader className="text-center">
          <p className="text-xs font-black tracking-[0.16em] text-amber-700 uppercase dark:text-amber-300">
            Full verse hint
          </p>
          <DialogTitle className="font-heading text-2xl font-black">
            {reference}
          </DialogTitle>
          <DialogDescription>
            Read slowly. This hint closes automatically.
          </DialogDescription>
        </DialogHeader>
        <blockquote className="rounded-2xl border border-amber-300/30 bg-background/75 p-5 text-center text-lg leading-8 font-bold text-foreground shadow-inner sm:text-xl">
          {verseText}
        </blockquote>
        <p className="text-center text-xs font-bold text-muted-foreground">
          Closes automatically after {HINT_DISPLAY_SECONDS} seconds
        </p>
      </DialogContent>
    </Dialog>
  );
}
