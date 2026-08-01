"use client";

import { motion, useReducedMotion } from "framer-motion";
import { RefreshCwIcon } from "lucide-react";
import { LunaMascot } from "@/components/shared/luna-mascot";
import { Button } from "@/components/ui/button";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

/**
 * Displays a safe recovery screen for unexpected root-segment render errors.
 *
 * The underlying error is deliberately not rendered because exception messages
 * can contain implementation details. It is acknowledged here to keep the
 * boundary signature explicit; production error reporting will be introduced
 * with the dedicated logging foundation instead of using console output.
 */
export function GlobalError({
  error,
  unstable_retry,
}: GlobalErrorProps): React.ReactNode {
  void error;
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-linear-to-b from-amber-50 via-orange-50 to-violet-100 px-5 py-8 text-slate-950 dark:from-slate-950 dark:via-[#150d20] dark:to-[#27123c] dark:text-white">
      <div
        className="absolute -top-32 left-1/2 size-96 -translate-x-1/2 rounded-full bg-amber-300/25 blur-3xl dark:bg-orange-500/12"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-36 left-1/2 h-72 w-[36rem] max-w-[130vw] -translate-x-1/2 rounded-[50%] bg-violet-400/25 blur-3xl dark:bg-violet-600/20"
        aria-hidden="true"
      />

      <motion.section
        className="relative w-full max-w-md text-center"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.45, ease: "easeOut" }}
        aria-labelledby="error-title"
      >
        <motion.div
          className="mx-auto h-72 w-60 sm:h-80 sm:w-72"
          animate={shouldReduceMotion ? undefined : { y: [0, -4, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <LunaMascot
            pose="retry"
            decorative
            priority
            sizes="(max-width: 640px) 240px, 288px"
            className="h-full w-full"
          />
        </motion.div>

        <h1
          id="error-title"
          className="font-heading text-4xl leading-tight font-black tracking-tight sm:text-5xl"
        >
          Oops we hit a snag
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 font-semibold text-slate-600 dark:text-slate-300">
          Luna could not load this. Try again.
        </p>

        <Button
          type="button"
          size="lg"
          className="mt-7 w-full max-w-xs"
          onClick={unstable_retry}
        >
          <RefreshCwIcon aria-hidden="true" />
          Try again
        </Button>
      </motion.section>
    </main>
  );
}
