"use client";
import { useEffect, useRef, type RefObject } from "react";

/** Measure fixed Bible surfaces so audio sits flush above the navbar and the
 * final verse scrolls clear of both. Observe wrapping/zoom without polling. */
export function useBibleDockHeight(
  property: "--bible-nav-height" | "--bible-audio-height",
  active = true,
): RefObject<HTMLElement | null> {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = ref.current;
    // The audio engine now lives outside the route's workspace. Root-scoped,
    // feature-prefixed variables let both persistent and route docks agree.
    const root = document.documentElement;
    if (!element) return;
    const update = (): void => {
      root.style.setProperty(
        property,
        `${active ? element.getBoundingClientRect().height : 0}px`,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty(property);
    };
  }, [property, active]);
  return ref;
}
