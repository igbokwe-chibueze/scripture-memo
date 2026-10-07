"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Combines the device preference with Scripture Memo's saved app preference.
 *
 * Framer Motion's `useReducedMotion` observes only the operating-system media
 * query. Scripture Memo also lets a learner enable reduced motion in Settings,
 * which `PreferenceSync` exposes as the `reduce-motion` class on the document
 * root. Interactive JavaScript animations must observe both sources because a
 * CSS duration override cannot stop timers, generated particles, or count-ups.
 */
export function useReducedMotionPreference(): boolean {
  const systemPrefersReducedMotion = useReducedMotion() ?? false;
  const [appPrefersReducedMotion, setAppPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const root = document.documentElement;

    /** Keeps local state aligned with the class owned by PreferenceSync. */
    const readAppPreference = (): void => {
      setAppPrefersReducedMotion(root.classList.contains("reduce-motion"));
    };

    readAppPreference();

    // WHY: Settings can change without remounting the current screen. Watching
    // only the class attribute makes that change effective immediately while
    // avoiding polling, storage reads, or additional database operations.
    const observer = new MutationObserver(readAppPreference);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return systemPrefersReducedMotion || appPrefersReducedMotion;
}
