import type { Metadata } from "next";
import { headers as getRequestHeaders } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scripture Memo",
  description: "Memorize Scripture through guided practice and reflection.",
};

/**
 * Defines the document shell shared by every route in Scripture Memo.
 *
 * The Sonner toaster lives here so feedback from any feature is announced from
 * one stable location instead of requiring each route to mount its own portal.
 * Font variables are applied to the root element so both server and client
 * components inherit the same typography without additional providers.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.ReactNode> {
  const [locale, messages, requestHeaders] = await Promise.all([
    getLocale(),
    getMessages(),
    getRequestHeaders(),
  ]);
  const nonce = requestHeaders.get("x-nonce") ?? undefined;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          nonce={nonce}
          attribute="class"
          defaultTheme="system"
          enableSystem
          enableColorScheme
          disableTransitionOnChange
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            <TooltipProvider>
              {children}
              <Toaster richColors closeButton duration={4000} />
            </TooltipProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
