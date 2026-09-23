"use client";

import { useEffect, useState } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { useReducedMotionPreference } from "@/hooks/use-reduced-motion-preference";

/**
 * Read-only motion diagnostics. Observes the real OS media query and app class;
 * never changes preferences, emulates the OS, or writes to persistent storage.
 */
export function MotionPreferencePreview(): React.ReactNode {
  const reduced = useReducedMotionPreference();
  const [sources, setSources] = useState<{ system: boolean; app: boolean } | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const root = document.documentElement;
    const update = (): void => {
      setSources({ system: query.matches, app: root.classList.contains("reduce-motion") });
    };
    update();
    query.addEventListener("change", update);
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => {
      query.removeEventListener("change", update);
      observer.disconnect();
    };
  }, []);

  return (
    <section id="motion-testing" className="space-y-4 rounded-2xl border bg-card p-5">
      <h2 className="font-heading text-xl font-bold">Reduced-motion testing</h2>
      <p className="text-sm text-muted-foreground">
        For the OS-only check, turn off Reduced Motion in app Settings and turn
        off animation effects in your device accessibility settings. Return here:
        OS should read On, app Off, and effective reduced motion On.
      </p>
      <dl className="grid gap-3 sm:grid-cols-3" aria-live="polite">
        {([
          ["OS reduced motion", sources?.system],
          ["App reduced motion", sources?.app],
          ["Effective reduced motion", sources ? reduced : undefined],
        ] as const).map(([label, value]) => (
          <div key={label} className="rounded-xl bg-muted p-3">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="font-bold">{value === undefined ? "Checking…" : value ? "On" : "Off"}</dd>
          </div>
        ))}
      </dl>
      {/* Deliberately omit local motion-reduce utilities: these samples exercise
       * the global CSS guard, independently of the JavaScript preference hook. */}
      <div className="flex items-center gap-4 rounded-xl border p-3">
        <LoaderCircleIcon className="size-8 animate-spin" aria-hidden="true" />
        <span className="size-8 animate-pulse rounded-full bg-primary" aria-hidden="true" />
        <p className="text-sm">With reduced motion On, both samples should stay still.</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Use the existing loading and celebration previews below. Check that
        entrances, particles, confetti and count-ups are suppressed, while close
        and continue controls still work. No gameplay setup is needed.
      </p>
    </section>
  );
}
