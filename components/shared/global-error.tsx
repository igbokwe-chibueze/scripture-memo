"use client";

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

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <section className="max-w-md space-y-4 text-center" aria-labelledby="error-title">
        <h1 id="error-title" className="text-2xl font-semibold">
          Something went wrong
        </h1>
        <p className="text-muted-foreground">
          Scripture Memo could not load this page. Please try again.
        </p>
        <Button type="button" onClick={unstable_retry}>
          Try again
        </Button>
      </section>
    </main>
  );
}
