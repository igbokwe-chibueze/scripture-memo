"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { detectTimeZoneAction } from "@/features/settings/actions/detect-time-zone.action";
import { applyDevicePreferences, readDevicePreferences, DEVICE_PREFERENCES_EVENT } from "../lib/device-preferences";

export type PreferenceSyncProps = {
  locale: "en" | "es" | "fr";
  hasConfiguredTimeZone: boolean;
};

/** Restore local presentation state and subscribe to saves without database reads. */
export function PreferenceSync({ locale, hasConfiguredTimeZone }: PreferenceSyncProps): null {
  const router = useRouter();
  useEffect(() => {
    const apply = (): void => applyDevicePreferences(readDevicePreferences());
    apply();
    document.documentElement.lang = locale;
    window.addEventListener("storage", apply);
    window.addEventListener(DEVICE_PREFERENCES_EVENT, apply);
    return () => {
      window.removeEventListener("storage", apply);
      window.removeEventListener(DEVICE_PREFERENCES_EVENT, apply);
    };
  }, [locale]);

  useEffect(() => {
    if (hasConfiguredTimeZone) return;
    const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detectedTimeZone) {
      // One-time account timezone detection is unrelated to local presentation.
      void detectTimeZoneAction({ timeZone: detectedTimeZone }).then((result) => {
        if (result.success) router.refresh();
      });
    }
  }, [hasConfiguredTimeZone, router]);
  return null;
}
