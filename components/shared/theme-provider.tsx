"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useState } from "react";

export type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

/**
 * Exposes next-themes through a project-owned client boundary.
 *
 * Keeping this wrapper small lets the root layout remain a Server Component and
 * gives the application one stable import if theme persistence evolves later.
 * All accepted props are forwarded directly to the installed provider.
 */
export function ThemeProvider({
  children,
  nonce,
  ...props
}: ThemeProviderProps): React.ReactNode {
  // Keep the document's nonce when an RSC refresh re-renders this client
  // boundary without a fresh document request. Proxy intentionally issues a
  // nonce only for HTML documents, so replacing this value with undefined
  // would make next-themes' temporary transition stylesheet violate the
  // still-active document CSP on the next theme change.
  const [documentNonce] = useState(nonce);

  // The nonce is intentionally fixed for this document's lifetime. A full
  // navigation remounts the provider and initializes it from the new response.
  return (
    <NextThemesProvider {...props} nonce={documentNonce}>
      {children}
    </NextThemesProvider>
  );
}
