"use client";

/** Shared compact-content surface: mobile bottom drawer, desktop centered modal.
 * Base UI owns focus trapping/restoration, Escape, outside dismissal and scroll
 * locking. Motion owns entry/exit; keepMounted lets the exit finish before the
 * portal is removed. No global dialog styles or dependencies are changed. */
import { useState, type ReactElement, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useReducedMotionPreference } from "@/hooks/use-reduced-motion-preference";

/** Trigger should be a shared Button with its own accessible name. Callers
 * supply localized title, description and close label; additional content can
 * contain prose or controls. Long content scrolls inside the safe-area panel. */
export function ResponsiveDialog({
  trigger,
  title,
  description,
  closeLabel,
  children,
}: {
  trigger: ReactElement;
  title: string;
  description: string;
  closeLabel: string;
  children?: ReactNode;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const desktop = useMediaQuery("(min-width: 640px)");
  const reduceMotion = useReducedMotionPreference();
  const resting = { opacity: 1, y: 0, scale: 1 };
  const hidden = {
    opacity: 0,
    y: reduceMotion || desktop ? 0 : "100%",
    scale: !reduceMotion && desktop ? 0.96 : 1,
  };
  const duration = reduceMotion ? 0.1 : 0.28;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal keepMounted>
            <DialogPrimitive.Backdrop
              className="fixed inset-0 z-50 bg-overlay"
              render={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration }}
                />
              }
            />
            {/* A non-interactive positioning wrapper avoids mixing Motion's
                transforms with CSS translations used for modal centering. */}
            <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
              <DialogPrimitive.Popup
                className="pointer-events-auto relative max-h-[85dvh] w-full overflow-y-auto overscroll-contain rounded-t-dialog border border-border bg-popover px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 text-popover-foreground shadow-xl outline-none sm:max-w-lg sm:rounded-dialog sm:p-6"
                render={
                  <motion.div
                    initial={hidden}
                    animate={resting}
                    exit={hidden}
                    transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
                  />
                }
              >
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-muted-foreground/30 sm:hidden"
                />
                <div className="space-y-3 pr-14">
                  <DialogTitle className="text-2xl leading-tight">
                    {title}
                  </DialogTitle>
                  <DialogDescription className="text-base leading-relaxed">
                    {description}
                  </DialogDescription>
                </div>
                {children && (
                  <div className="mt-5 space-y-4 text-base leading-relaxed">
                    {children}
                  </div>
                )}
                <DialogClose
                  render={
                    <Button
                      variant="outline"
                      size="icon-lg"
                      className="absolute right-4 top-5 size-11 bg-popover"
                    />
                  }
                >
                  <XIcon aria-hidden="true" />
                  <span className="sr-only">{closeLabel}</span>
                </DialogClose>
              </DialogPrimitive.Popup>
            </div>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
