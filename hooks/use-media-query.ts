"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Hydration-safe, event-driven viewport matching. The server uses the mobile
 * fallback; browser media-query events update on resize without any polling. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void): (() => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", notify);
      return () => media.removeEventListener("change", notify);
    },
    [query],
  );
  const snapshot = useCallback(
    (): boolean => window.matchMedia(query).matches,
    [query],
  );
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
