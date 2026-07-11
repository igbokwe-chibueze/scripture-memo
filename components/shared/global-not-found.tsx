import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

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
        {/*
          WHY: This action navigates to another URL, so it must retain native
          anchor semantics. Base UI explicitly recommends styling links directly
          instead of rendering an anchor through its behavior-oriented Button.
        */}
        <Link href="/" className={buttonVariants({ className: "min-h-11" })}>
          Return home
        </Link>
      </section>
    </main>
  );
}
