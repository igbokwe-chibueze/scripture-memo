import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Provides a consistent recovery destination when no route matches a request.
 *
 * Returning users to the application root is always safe at bootstrap time and
 * avoids guessing whether they have an authenticated game destination.
 */
export function GlobalNotFound(): React.ReactNode {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <section className="max-w-md space-y-4 text-center" aria-labelledby="not-found-title">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 id="not-found-title" className="text-2xl font-semibold">
          Page not found
        </h1>
        <p className="text-muted-foreground">
          The page you requested does not exist or may have moved.
        </p>
        <Button render={<Link href="/" />}>Return home</Button>
      </section>
    </main>
  );
}
