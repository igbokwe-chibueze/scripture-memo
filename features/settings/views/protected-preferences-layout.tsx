import { PreferenceSync } from "@/features/settings/components/preference-sync";
import { getCurrentPreferences } from "@/features/settings/lib/get-current-preferences";
import { MobileGameNavigation } from "@/components/shared/mobile-game-navigation";
import { getNotificationShellData } from "@/features/notifications/lib/get-notification-shell-data";
import { getPlayerShellSummary } from "@/features/player-shell/lib/get-player-shell-summary";

/** Applies authenticated preferences around every protected route group page. */
export async function ProtectedPreferencesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): Promise<React.ReactNode> {
  // WHY: Both loaders share the request-cached Better Auth session. Running the
  // independent settings and notification reads together avoids serial latency
  // while retaining clear feature repository ownership.
  const [preferences, notifications, playerSummary] = await Promise.all([
    getCurrentPreferences(),
    getNotificationShellData(),
    getPlayerShellSummary(),
  ]);

  return (
    <>
      <PreferenceSync {...preferences} />
      <MobileGameNavigation
        notifications={notifications}
        playerSummary={playerSummary}
      >
        {children}
      </MobileGameNavigation>
    </>
  );
}
