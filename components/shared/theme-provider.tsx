"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

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
  ...props
}: ThemeProviderProps): React.ReactNode {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
