"use client";

import { useEffect, useRef, useState } from "react";
import { PlayIcon, XIcon } from "lucide-react";
import { GlobalError } from "@/components/shared/global-error";
import { Button } from "@/components/ui/button";

/** Replays the exact production recoverable-error boundary safely. */
export function ErrorScreenPreview(): React.ReactNode {
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

  const closePreview = (): void => setIsOpen(false);

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold">Recoverable error</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open the exact production Luna recovery experience.
          </p>
        </div>
        <Button
          ref={launchButtonRef}
          type="button"
          onClick={() => setIsOpen(true)}
        >
          <PlayIcon aria-hidden="true" />
          Preview Luna error screen
        </Button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-70 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Luna recoverable error preview"
        >
          <GlobalError error={new Error("UI preview only")} unstable_retry={closePreview} />
          <Button
            ref={closeButtonRef}
            type="button"
            variant="outline"
            size="icon-lg"
            className="fixed top-4 right-4 z-80 rounded-full bg-background/85 backdrop-blur-md sm:top-6 sm:right-6"
            aria-label="Close recoverable error preview"
            onClick={closePreview}
          >
            <XIcon aria-hidden="true" />
          </Button>
        </div>
      )}
    </section>
  );
}
