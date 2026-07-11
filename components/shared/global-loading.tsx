/**
 * Provides the root route's accessible loading fallback.
 *
 * This intentionally avoids feature-specific language because Next.js may show
 * it while loading any route. The status role and visually hidden text ensure
 * screen-reader users receive the same progress indication as sighted users.
 */
export function GlobalLoading(): React.ReactNode {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-background text-foreground"
      aria-label="Loading page"
    >
      <div
        className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary"
        aria-hidden="true"
      />
      <span className="sr-only">Loading Scripture Memo…</span>
    </main>
  );
}
