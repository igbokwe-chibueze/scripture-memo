"use client";

import { useEffect, type RefObject } from "react";

/** Allow scrolling within the popup only when an ancestor can consume it.
 * Background wheel/touch gestures must not chain into the reading document.
 * This deliberately leaves html/body styles and scroll ownership untouched.
 */
function canScrollPopup(
  target: EventTarget | null,
  popup: HTMLElement,
  deltaX: number,
  deltaY: number,
): boolean {
  if (!(target instanceof Element) || !popup.contains(target)) return false;
  let element: Element | null = target;
  while (element && popup.contains(element)) {
    const styles = getComputedStyle(element);
    const vertical = /auto|scroll/.test(styles.overflowY);
    const horizontal = /auto|scroll/.test(styles.overflowX);
    if (
      (vertical &&
        ((deltaY < 0 && element.scrollTop > 0) ||
          (deltaY > 0 &&
            element.scrollTop + element.clientHeight <
              element.scrollHeight - 1))) ||
      (horizontal &&
        ((deltaX < 0 && element.scrollLeft > 0) ||
          (deltaX > 0 &&
            element.scrollLeft + element.clientWidth <
              element.scrollWidth - 1)))
    ) {
      return true;
    }
    if (element === popup) break;
    element = element.parentElement;
  }
  return false;
}

/** Guard mounted modal input without transferring document scroll to body.
 * Mount alongside the popup inside its animated portal so protection lasts
 * through exit. Base UI's trap-focus mode still owns focus and dismissal, and
 * the backdrop blocks clicks. Native non-passive listeners are required because
 * browser/React passive touch/wheel listeners cannot cancel scroll chaining.
 * No layout writes, timers, polling, database calls or persistent state occur.
 */
export function useDialogScrollGuard(
  popupRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const popup = popupRef.current;
    if (!popup) return;
    const doc = popup.ownerDocument;
    let touch: { x: number; y: number } | null = null;

    function wheel(event: WheelEvent): void {
      if (!popup || event.ctrlKey) return;
      if (!canScrollPopup(event.target, popup, event.deltaX, event.deltaY)) {
        event.preventDefault();
      }
    }

    function touchStart(event: TouchEvent): void {
      const finger = event.touches.length === 1 ? event.touches[0] : null;
      touch = finger ? { x: finger.clientX, y: finger.clientY } : null;
    }

    function touchMove(event: TouchEvent): void {
      // Preserve pinch zoom; only single-finger panning needs containment.
      const finger = event.touches.length === 1 ? event.touches[0] : null;
      if (!finger || !touch || !popup) return;
      const deltaX = touch.x - finger.clientX;
      const deltaY = touch.y - finger.clientY;
      touch = { x: finger.clientX, y: finger.clientY };
      if (!canScrollPopup(event.target, popup, deltaX, deltaY)) {
        event.preventDefault();
      }
    }

    function keyDown(event: KeyboardEvent): void {
      if (!popup) return;
      const target = event.target;
      // Keep keyboard controls, text editing and button activation native.
      if (
        target instanceof Element &&
        (target.closest("input, textarea, select, [contenteditable='true']") ||
          (event.key === " " && target.closest("button")))
      )
        return;
      const directions: Record<string, number> = {
        ArrowUp: -1,
        PageUp: -1,
        Home: -1,
        ArrowDown: 1,
        PageDown: 1,
        End: 1,
        " ": event.shiftKey ? -1 : 1,
      };
      const direction = directions[event.key];
      if (direction && !canScrollPopup(target, popup, 0, direction)) {
        event.preventDefault();
      }
    }

    doc.addEventListener("wheel", wheel, { passive: false, capture: true });
    doc.addEventListener("touchstart", touchStart, {
      passive: true,
      capture: true,
    });
    doc.addEventListener("touchmove", touchMove, {
      passive: false,
      capture: true,
    });
    doc.addEventListener("keydown", keyDown, true);
    return () => {
      doc.removeEventListener("wheel", wheel, true);
      doc.removeEventListener("touchstart", touchStart, true);
      doc.removeEventListener("touchmove", touchMove, true);
      doc.removeEventListener("keydown", keyDown, true);
    };
  }, [popupRef]);
}
