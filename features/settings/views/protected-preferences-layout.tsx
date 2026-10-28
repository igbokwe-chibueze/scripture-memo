import { PreferenceSync } from "@/features/settings/components/preference-sync";
import { getCurrentPreferences } from "@/features/settings/lib/get-current-preferences";
import { MobileGameNavigation } from "@/components/shared/mobile-game-navigation";
import { getNotificationShellData } from "@/features/notifications/lib/get-notification-shell-data";
import { getPlayerShellSummary } from "@/features/player-shell/lib/get-player-shell-summary";
import { createHash } from "node:crypto";
import { requireServerSession } from "@/lib/auth/session";
import { BibleAudioProvider } from "@/features/bible";

/** Keeps account preferences and the Bible audio session across protected routes. */
export async function ProtectedPreferencesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): Promise<React.ReactNode> {
  // WHY: Both loaders share the request-cached Better Auth session. Running the
  // independent settings and notification reads together avoids serial latency
  // while retaining clear feature repository ownership.
  const [preferences, notifications, playerSummary, session] =
    await Promise.all([
      getCurrentPreferences(),
      getNotificationShellData(),
      getPlayerShellSummary(),
      requireServerSession(),
    ]);
  // The session loader is request-memoized with the existing shell loaders.
  // Opaque account scope resets all in-memory media on an account change.
  const audioScope = createHash("sha256")
    .update(session.user.id)
    .digest("hex")
    .slice(0, 24);

  return (
    <>
      <PreferenceSync {...preferences} />
      <BibleAudioProvider key={audioScope} scope={audioScope}>
        <MobileGameNavigation
          notifications={notifications}
          playerSummary={playerSummary}
        >
          {children}
        </MobileGameNavigation>
      </BibleAudioProvider>
    </>
  );
}
