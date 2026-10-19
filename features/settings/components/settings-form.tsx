"use client";

import { useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActionResult } from "@/types/api";
import { LOCALE_COOKIE_NAME } from "@/i18n/config";
import { SettingsFormContent, type SettingsFormProps } from "./settings-form-content";
import { updateUserSettingsAction } from "../actions/update-user-settings.action";
import { accountSettingsSchema, type UpdateUserSettingsInput } from "../schemas/update-user-settings.schema";
import { devicePreferencesSchema, readDevicePreferences, saveDevicePreferences } from "../lib/device-preferences";
import { getChangedSettings } from "../lib/settings-diff";
import { useDevicePreferencesSnapshot } from "../hooks/use-device-preferences";

/**
 * Save only changed account fields through the authenticated action. Device-only
 * edits never issue a server mutation; language uses a non-sensitive cookie.
 * Browser preferences are read after hydration so SSR remains deterministic.
 */
export function SettingsForm(
  props: Omit<SettingsFormProps, "save" | "onSaved">,
): React.ReactNode {
  const router = useRouter();
  const { setTheme } = useTheme();
  const t = useTranslations("Settings");
  const snapshot = useDevicePreferencesSnapshot();
  const needsRefresh = useRef(false);
  const themeChanged = useRef(false);
  const initialValues = useMemo(() => ({
    ...props.initialValues,
    ...(snapshot === null ? {} : readDevicePreferences()),
  }), [props.initialValues, snapshot]);

  async function save(input: UpdateUserSettingsInput, previous: UpdateUserSettingsInput): Promise<ActionResult> {
    const account = accountSettingsSchema.parse(input);
    const accountPatch = getChangedSettings(accountSettingsSchema.parse(previous), account);
    const accountChanged = Object.keys(accountPatch).length > 0;
    const localeChanged = input.locale !== previous.locale;
    themeChanged.current = input.theme !== previous.theme;
    needsRefresh.current = accountChanged || localeChanged;
    if (accountChanged) {
      const result = await updateUserSettingsAction(accountPatch);
      if (!result.success) return result;
    }
    const devicePatch = getChangedSettings(
      devicePreferencesSchema.parse(previous), devicePreferencesSchema.parse(input),
    );
    // Account/language edits remain usable even when browser storage is blocked.
    if (Object.keys(devicePatch).length > 0 && !saveDevicePreferences({ ...readDevicePreferences(), ...devicePatch })) {
      return { success: false, message: t("deviceStorageError") };
    }
    if (localeChanged) {
      document.cookie = `${LOCALE_COOKIE_NAME}=${input.locale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    }
    return { success: true, message: t("saved") };
  }

  if (snapshot === null) {
    return <Skeleton className="h-96 w-full" aria-label={t("title")} />;
  }
  return (
    <SettingsFormContent
      {...props}
      initialValues={initialValues}
      save={save}
      onSaved={(input) => {
        if (themeChanged.current) setTheme(input.theme);
        document.documentElement.lang = input.locale;
        // Refresh only server-rendered language/account data after explicit Save.
        if (needsRefresh.current) router.refresh();
      }}
    />
  );
}
