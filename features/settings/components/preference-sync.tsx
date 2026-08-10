"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { detectTimeZoneAction } from "@/features/settings/actions/detect-time-zone.action";
import { LOCALE_COOKIE_NAME } from "@/i18n/config";

export type PreferenceSyncProps = {
  theme: "light" | "dark" | "system";
  reducedMotion: boolean;
  audioEnabled: boolean;
  locale: "en" | "es" | "fr";
  hasConfiguredTimeZone: boolean;
};

/**
 * Reapplies database-backed preferences when an authenticated shell loads.
 * Audio is exposed as a document data attribute until the gameplay audio context
 * is introduced, giving future consumers one stable, persisted signal.
 */
export function PreferenceSync({
  theme,
  reducedMotion,
  audioEnabled,
  locale,
  hasConfiguredTimeZone,
}: PreferenceSyncProps): null {
  const router = useRouter();
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme(theme);
    document.documentElement.classList.toggle("reduce-motion", reducedMotion);
    document.documentElement.dataset.audioEnabled = String(audioEnabled);
    document.documentElement.lang = locale;
    // WHY: Locale is not sensitive. Mirroring the already-authoritative server
    // preference into a browser cookie lets future requests translate without a
    // database read. The Settings action also writes it immediately on changes.
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;

    return () => {
      document.documentElement.classList.remove("reduce-motion");
      delete document.documentElement.dataset.audioEnabled;
    };
  }, [audioEnabled, locale, reducedMotion, setTheme, theme]);

  useEffect(() => {
    if (hasConfiguredTimeZone) return;
    const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detectedTimeZone) {
      // Background detection intentionally has no toast: it is a one-time
      // preference default, not an interaction requiring user feedback.
      void detectTimeZoneAction({ timeZone: detectedTimeZone }).then((result) => {
        if (result.success) router.refresh();
      });
    }
  }, [hasConfiguredTimeZone, router]);

  return null;
}
