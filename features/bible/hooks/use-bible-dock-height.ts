"use client";
import { useEffect, useRef, type RefObject } from "react";

/** Measure fixed Bible surfaces so audio sits flush above the navbar and the
 * final verse scrolls clear of both. Observe wrapping/zoom without polling. */
export function useBibleDockHeight(
  property: "--bible-nav-height" | "--bible-audio-height",
): RefObject<HTMLElement | null> {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = ref.current;
    const workspace = element?.closest<HTMLElement>(".bible-workspace");
    if (!element || !workspace) return;
    const update = (): void => {
      workspace.style.setProperty(
        property,
        `${element.getBoundingClientRect().height}px`,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      observer.disconnect();
      workspace.style.removeProperty(property);
    };
  }, [property]);
  return ref;
}
