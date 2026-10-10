"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, EyeIcon, PaletteIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/shared/loading-button";
import type { ActionResult } from "@/types/api";
import {
  BRAND_THEMES,
  type BrandThemeId,
} from "@/features/brand-themes/constants/brand-themes";
import { updateActiveBrandThemeAction } from "@/features/brand-themes/actions/update-active-brand-theme.action";
import {
  clearBrandThemePreviewAction,
  startBrandThemePreviewAction,
} from "@/features/brand-themes/actions/brand-theme-preview.action";

/** Super Admin-only controls for local preview and global brand activation. */
export function BrandThemeManager({
  activeThemeId,
  initialPreviewThemeId,
}: {
  activeThemeId: BrandThemeId;
  initialPreviewThemeId: BrandThemeId | null;
}): React.ReactNode {
  const router = useRouter();
  const [previewThemeId, setPreviewThemeId] = useState(
    initialPreviewThemeId ?? activeThemeId,
  );
  const [isPending, startTransition] = useTransition();
  const hasUnsavedPreview = previewThemeId !== activeThemeId;

  // The preview cookie lets the same Super Admin inspect any route and reload
  // during its one-hour lifetime. next-themes still owns its independent class.
  useEffect(() => {
    document.documentElement.dataset.brandTheme = previewThemeId;
  }, [previewThemeId]);

  function previewTheme(themeId: BrandThemeId): void {
    const previousThemeId = previewThemeId;
    setPreviewThemeId(themeId);

    startTransition(async () => {
      const result = await startBrandThemePreviewAction({ themeId }).catch(
        (): ActionResult => ({
          success: false,
          message: "Theme preview could not be saved. Please try again.",
        }),
      );

      if (!result.success) {
        setPreviewThemeId(previousThemeId);
        toast.error(result.message, { duration: Infinity });
        return;
      }

      router.refresh();
    });
  }

  function cancelPreview(): void {
    const previousThemeId = previewThemeId;
    setPreviewThemeId(activeThemeId);

    startTransition(async () => {
      const result = await clearBrandThemePreviewAction().catch(
        (): ActionResult => ({
          success: false,
          message: "Theme preview could not be cleared. Please try again.",
        }),
      );

      if (!result.success) {
        setPreviewThemeId(previousThemeId);
        toast.error(result.message, { duration: Infinity });
        return;
      }

      router.refresh();
    });
  }

  function applyTheme(): void {
    startTransition(async () => {
      const result = await updateActiveBrandThemeAction({
        themeId: previewThemeId,
      }).catch(
        (): ActionResult => ({
          success: false,
          message: "The brand theme could not be applied. Please try again.",
        }),
      );

      if (!result.success) {
        toast.error(result.message, { duration: Infinity });
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <section
      aria-labelledby="brand-theme-heading"
      className="space-y-5 rounded-3xl border bg-card p-4 sm:p-6"
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <PaletteIcon className="size-5" aria-hidden="true" />
          <h2
            id="brand-theme-heading"
            className="text-xl font-bold text-foreground"
          >
            Global brand theme
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Preview a palette across your browser, then apply it for everyone.
          Every player’s Light, Dark, or System setting remains independent.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {BRAND_THEMES.map((theme) => {
          const isActive = theme.id === activeThemeId;
          const isPreviewed = theme.id === previewThemeId;

          return (
            <article
              key={theme.id}
              className={`rounded-2xl border p-4 ${
                isPreviewed
                  ? "border-primary bg-selection-subtle"
                  : "border-border bg-background"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{theme.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {theme.description}
                  </p>
                </div>
                {isActive && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-subtle px-2 py-1 text-xs font-bold text-success-text">
                    <CheckIcon className="size-3.5" aria-hidden="true" />
                    Live
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant={isPreviewed ? "secondary" : "outline"}
                aria-pressed={isPreviewed}
                disabled={isPending || isPreviewed}
                className="mt-4 w-full"
                onClick={() => previewTheme(theme.id)}
              >
                <EyeIcon aria-hidden="true" />
                {isPreviewed ? "Preview active" : "Preview this theme"}
              </Button>
            </article>
          );
        })}
      </div>

      {hasUnsavedPreview ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning-border bg-warning-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-warning-text">
            This preview follows your browser across pages for one hour. Cancel
            it to restore the live theme, or apply it for all players.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={cancelPreview}
            >
              Cancel preview
            </Button>
            <LoadingButton
              type="button"
              isPending={isPending}
              pendingLabel="Applying theme"
              onClick={applyTheme}
            >
              Apply globally
            </LoadingButton>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          The selected theme is active for all players.
        </p>
      )}
    </section>
  );
}
