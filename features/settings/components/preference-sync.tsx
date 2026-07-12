"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export type PreferenceSyncProps = {
  theme: "light" | "dark" | "system";
  reducedMotion: boolean;
  audioEnabled: boolean;
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
}: PreferenceSyncProps): null {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme(theme);
    document.documentElement.classList.toggle("reduce-motion", reducedMotion);
    document.documentElement.dataset.audioEnabled = String(audioEnabled);

    return () => {
      document.documentElement.classList.remove("reduce-motion");
      delete document.documentElement.dataset.audioEnabled;
    };
  }, [audioEnabled, reducedMotion, setTheme, theme]);

  return null;
}
