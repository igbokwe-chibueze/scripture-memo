import { PreferenceSync } from "@/features/settings/components/preference-sync";
import { getCurrentPreferences } from "@/features/settings/lib/get-current-preferences";
import { MobileGameNavigation } from "@/components/shared/mobile-game-navigation";

/** Applies authenticated preferences around every protected route group page. */
export async function ProtectedPreferencesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): Promise<React.ReactNode> {
  const preferences = await getCurrentPreferences();

  return (
    <>
      <PreferenceSync {...preferences} />
      <MobileGameNavigation>{children}</MobileGameNavigation>
    </>
  );
}
