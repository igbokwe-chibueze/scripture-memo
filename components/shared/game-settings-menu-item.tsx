"use client";

import { useTranslations } from "next-intl";
import { Settings2Icon } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { NavigationButton } from "@/components/shared/navigation-button";

/** The Settings route always opens its Game tab; navigation does not pause play. */
export function GameSettingsMenuItem(): React.ReactNode {
  const t = useTranslations("Settings");
  return (
    <DropdownMenuItem
      nativeButton={false}
      render={
        <NavigationButton
          href="/settings"
          pendingLabel={t("openingGameSettings")}
          variant="ghost"
          className="min-h-11 w-full justify-start gap-3"
        />
      }
    >
      <Settings2Icon aria-hidden="true" />
      {t("gameSettings")}
    </DropdownMenuItem>
  );
}
