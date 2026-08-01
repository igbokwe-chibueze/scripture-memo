"use client";

import { useEffect, useRef, useState } from "react";
import { PlayIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalLoading } from "@/components/shared/global-loading";

/** Replays the exact production route-loading scene without artificial latency. */
export function LoadingScreenPreview(): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const launchButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const launchButton = launchButtonRef.current;
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      launchButton?.focus();
    };
  }, [isOpen]);

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold">Loading transition</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open the exact global and protected-route loading experience.
          </p>
        </div>
        <Button
          ref={launchButtonRef}
          type="button"
          onClick={() => setIsOpen(true)}
        >
          <PlayIcon aria-hidden="true" />
          Preview Luna loading screen
        </Button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-70 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Luna loading screen preview"
        >
          <GlobalLoading />
          <Button
            ref={closeButtonRef}
            type="button"
            variant="outline"
            size="icon-lg"
            className="fixed top-4 right-4 z-80 rounded-full bg-background/85 backdrop-blur-md sm:top-6 sm:right-6"
            aria-label="Close loading screen preview"
            onClick={() => setIsOpen(false)}
          >
            <XIcon aria-hidden="true" />
          </Button>
        </div>
      )}
    </section>
  );
}
