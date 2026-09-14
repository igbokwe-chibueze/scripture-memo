"use client";

import { cn } from "@/lib/utils";
import { useReducedMotionPreference } from "@/hooks/use-reduced-motion-preference";

const CONFETTI_PIECES = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  delay: `${(index % 7) * 70}ms`,
  duration: `${900 + (index % 5) * 120}ms`,
  color: ["bg-amber-300", "bg-violet-400", "bg-emerald-400", "bg-fuchsia-400"][
    index % 4
  ],
}));

/**
 * Renders a brief, non-interactive celebration without blocking navigation.
 *
 * The shared preference hook covers both the operating-system setting and the
 * saved Scripture Memo setting. Returning no decorative nodes prevents app-
 * selected reduced motion from leaving static confetti across the viewport.
 */
export function ConfettiCelebration({ show }: { show: boolean }): React.ReactNode {
  const shouldReduceMotion = useReducedMotionPreference();

  if (!show || shouldReduceMotion) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden="true"
    >
      {CONFETTI_PIECES.map((piece) => (
        <span
          key={piece.id}
          className={cn(
            "animate-gameplay-confetti absolute -top-5 size-2.5 rounded-xs opacity-90 motion-reduce:hidden",
            piece.color,
          )}
          style={{
            left: piece.left,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
          }}
        />
      ))}
    </div>
  );
}
