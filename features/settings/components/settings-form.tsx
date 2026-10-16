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
import { readDevicePreferences, saveDevicePreferences } from "../lib/device-preferences";
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
  const baseline = useRef(accountSettingsSchema.parse(props.initialValues));
  const needsRefresh = useRef(false);
  const initialValues = useMemo(() => ({
    ...props.initialValues,
    ...(snapshot === null ? {} : readDevicePreferences()),
  }), [props.initialValues, snapshot]);

  async function save(input: UpdateUserSettingsInput): Promise<ActionResult> {
    const account = accountSettingsSchema.parse(input);
    const accountChanged = (Object.keys(account) as (keyof typeof account)[])
      .some((key) => account[key] !== baseline.current[key]);
    needsRefresh.current = accountChanged || input.locale !== props.initialValues.locale;
    if (accountChanged) {
      const result = await updateUserSettingsAction(account);
      if (!result.success) return result;
      baseline.current = account;
    }
    const currentDevice = readDevicePreferences();
    const deviceChanged = (Object.keys(currentDevice) as (keyof typeof currentDevice)[])
      .some((key) => input[key] !== currentDevice[key]);
    // Account/language edits remain usable even when browser storage is blocked.
    if (deviceChanged && !saveDevicePreferences(input)) {
      return { success: false, message: t("deviceStorageError") };
    }
    document.cookie = `${LOCALE_COOKIE_NAME}=${input.locale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
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
        setTheme(input.theme);
        document.documentElement.lang = input.locale;
        // Refresh only server-rendered language/account data after explicit Save.
        if (needsRefresh.current) router.refresh();
      }}
    />
  );
}
