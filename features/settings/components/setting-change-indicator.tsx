import { PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";

/** A text-and-icon marker distinguishes unsaved edits without relying on color. */
export function SettingChangeIndicator({ changed }: { changed: boolean }): React.ReactNode {
  const t = useTranslations("Settings");
  if (!changed) return null;
  return (
    <span data-slot="setting-change" className="inline-flex items-center gap-1 rounded-full bg-selection-subtle px-2 py-1 text-xs font-bold text-selection-text">
      <PencilIcon className="size-3" aria-hidden="true" />
      {t("unsavedChange")}
    </span>
  );
}
