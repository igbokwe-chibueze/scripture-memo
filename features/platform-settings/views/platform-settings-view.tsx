import type { Metadata } from "next";
import { ShieldCheckIcon } from "lucide-react";
import { NavigationButton } from "@/components/shared/navigation-button";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { PlatformSettingsForm } from "@/features/platform-settings/components/platform-settings-form";
import { platformSettingsRepository } from "@/features/platform-settings/repositories/platform-settings.repository";
import { getSuperAdminSession } from "@/features/auth/lib/get-admin-session";
import { BrandThemeManager } from "@/features/brand-themes/components/brand-theme-manager";
import { getActiveBrandTheme } from "@/features/brand-themes/lib/get-active-brand-theme";
import { getBrandThemePreview } from "@/features/brand-themes/lib/get-brand-theme-preview";

export const metadata: Metadata = {
  title: "Platform settings | Scripture Memo",
  robots: { index: false, follow: false },
};

/** Super Admin workspace for shared translation and progression defaults. */
export async function PlatformSettingsView(): Promise<React.ReactNode> {
  await getSuperAdminSession();
  const [settings, activeBrandThemeId, previewBrandThemeId] = await Promise.all([
    platformSettingsRepository.get(),
    getActiveBrandTheme(),
    getBrandThemePreview(),
  ]);

  return (
    <main className="min-h-svh bg-muted/20 py-6 sm:py-8">
      <ResponsiveContainer size="md" className="space-y-6">
        <PageHeader
          eyebrow={
            <span className="inline-flex items-center gap-2">
              <ShieldCheckIcon className="size-4" aria-hidden="true" />
              Super Admin
            </span>
          }
          title="Platform settings"
          description="Set defaults for new players and future challenge rewards. Every save is recorded in the audit log."
          action={
            <NavigationButton href="/admin" pendingLabel="Returning to admin" variant="outline">
              Back to admin
            </NavigationButton>
          }
        />
        <PlatformSettingsForm
          initialValues={{
            defaultTranslation: settings.defaultTranslation,
            baseGlowPoints: settings.baseGlowPoints,
            defaultHintAllowance: settings.defaultHintAllowance,
            adminCooldownTestingEnabled:
              settings.adminCooldownTestingEnabled,
          }}
        />
        <BrandThemeManager
          key={`${activeBrandThemeId}:${previewBrandThemeId ?? ""}`}
          activeThemeId={activeBrandThemeId}
          initialPreviewThemeId={previewBrandThemeId}
        />
      </ResponsiveContainer>
    </main>
  );
}
