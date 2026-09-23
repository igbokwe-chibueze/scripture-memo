"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { SettingsFormContent, type SettingsFormProps } from "./settings-form-content";
import { updateUserSettingsAction } from "../actions/update-user-settings.action";

/** Production-only binding keeps saved preferences and server state synchronized. */
export function SettingsForm(
  props: Omit<SettingsFormProps, "save" | "onSaved">,
): React.ReactNode {
  const router = useRouter();
  const { setTheme } = useTheme();

  return (
    <SettingsFormContent
      {...props}
      save={updateUserSettingsAction}
      onSaved={(input) => {
        // Apply only acknowledged preferences, then refresh server-rendered copy.
        setTheme(input.theme);
        document.documentElement.classList.toggle("reduce-motion", input.reducedMotion);
        document.documentElement.lang = input.locale;
        router.refresh();
      }}
    />
  );
}
