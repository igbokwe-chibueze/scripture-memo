/** Signed-in profile composition; the repository returns only approved public fields. */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeftIcon, AwardIcon, FlameIcon, MapPinCheckIcon, SparklesIcon } from "lucide-react";
import { getServerSession } from "@/lib/auth/session";
import { GamePageColumns } from "@/components/shared/game-page-columns";
import { EmptyState } from "@/components/shared/empty-state";
import { NavigationButton } from "@/components/shared/navigation-button";
import { StatCard } from "@/components/shared/stat-card";
import { CountryFlag } from "@/components/shared/country-flag";
import { FriendControls } from "@/features/friends";
import { PlayerAvatar } from "../components/player-avatar";
import { UsernameForm } from "../components/username-form";
import { ProfileShareTools } from "../components/profile-share-tools";
import { playerProfileRepository } from "../repositories/player-profile.repository";
import { publicProfileSchema } from "../schemas/public-profile.schema";

export const metadata: Metadata = {
  title: "Player profile | Scripture Memo",
  description: "A Scripture Memo learner's journey and achievements.",
  robots: { index: false, follow: false },
};

/** Auth precedes identity reads; blocked and missing profiles share a neutral 404. */
export async function MemberProfileView({ params }: {
  params: Promise<{ publicId: string }>;
}): Promise<React.ReactNode> {
  const parsed = publicProfileSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const session = await getServerSession();
  if (!session?.user) redirect(`/login?next=${encodeURIComponent(`/profiles/${parsed.data.publicId}`)}`);
  const [profile, t, locale] = await Promise.all([
    playerProfileRepository.getProfile(session.user.id, parsed.data.publicId),
    getTranslations("PlayerSocial"),
    getLocale(),
  ]);
  if (!profile) notFound();
  const self = profile.relationship === "self";

  return (
    <GamePageColumns contextPanel={(
      <aside className="space-y-3 rounded-card border border-border bg-card p-5">
        <h2 className="font-heading text-xl">{t("connectTitle")}</h2>
        <p className="text-muted-foreground">{t("connectDescription")}</p>
        <NavigationButton
          href="/friends"
          pendingLabel={t("opening")}
          variant="secondary"
          className="min-h-11"
          prefetch={false}
        >
          {t("friendsTitle")}
        </NavigationButton>
      </aside>
    )}>
      <main className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6">
        <NavigationButton
          href="/friends"
          pendingLabel={t("opening")}
          variant="secondary"
          className="min-h-11"
          prefetch={false}
        >
          <ArrowLeftIcon aria-hidden="true" />
          {t("friendsTitle")}
        </NavigationButton>
        <header className="space-y-5 rounded-card border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <PlayerAvatar
              avatarKey={profile.avatarKey}
              frameKey={profile.avatarFrameKey}
              displayName={profile.displayName}
              size="xl"
            />
            <div className="min-w-0 max-w-full space-y-2">
              <h1 className="break-words font-heading text-3xl sm:text-4xl">{profile.displayName}</h1>
              <p className="break-all text-lg text-primary">{profile.username ? `@${profile.username}` : t("noUsername")}</p>
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground sm:justify-start">
                {profile.countryCode && (
                  <CountryFlag
                    countryCode={profile.countryCode}
                    label={profile.countryCode}
                    className="h-5 w-7"
                  />
                )}
                <p>
                  {t("joined", {
                    date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(profile.joinedAt)),
                  })}
                </p>
              </div>
            </div>
          </div>
          {self ? (
            <NavigationButton
              href="/settings"
              pendingLabel={t("opening")}
              variant="secondary"
              className="min-h-11"
              prefetch={false}
            >
              {t("editProfile")}
            </NavigationButton>
          ) : (
            <FriendControls
              publicId={profile.publicId}
              relationship={profile.relationship}
              displayName={profile.displayName}
            />
          )}
          {self && <ProfileShareTools publicId={profile.publicId} />}
        </header>
        {self && (
          <UsernameForm
            key={profile.username ?? "unclaimed"}
            username={profile.username}
            nextChangeAt={profile.nextUsernameChangeAt}
          />
        )}
        <section
          className="grid grid-cols-2 gap-3 [&_[data-slot=card-content]]:flex-col [&_[data-slot=card-content]]:items-start [&_.tabular-nums]:break-all"
          aria-label={t("journeyStats")}
        >
          <StatCard
            label={t("beaconLevel")}
            value={profile.beaconLevel.toLocaleString(locale)}
            icon={<SparklesIcon />}
          />
          <StatCard
            label={t("lifetimeXp")}
            value={profile.lifetimeBeaconXp.toLocaleString(locale)}
            icon={<SparklesIcon />}
          />
          <StatCard
            label={t("waypoints")}
            value={profile.completedWaypoints.toLocaleString(locale)}
            icon={<MapPinCheckIcon />}
          />
          <StatCard
            label={t("streak")}
            value={profile.currentStreak.toLocaleString(locale)}
            supportingText={t("bestStreak", { count: profile.bestStreak })}
            icon={<FlameIcon />}
          />
        </section>
        <section className="space-y-4">
          <h2 className="font-heading text-2xl">{t("earnedBadges")}</h2>
          {profile.badges.length === 0 ? (
            <EmptyState
              title={t("noBadges")}
              description={t("noBadgesHelp")}
              icon={<AwardIcon />}
            />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {profile.badges.map((badge) => (
                <li
                  key={badge.id}
                  className="flex min-w-0 flex-col items-center gap-3 rounded-card border border-border bg-card p-4 text-center"
                >
                  <span
                    className="text-4xl"
                    aria-hidden="true"
                  >
                    {badge.icon ?? "🏅"}
                  </span>
                  <h3 className="break-words font-heading text-lg">{badge.name}</h3>
                </li>
              ))}
            </ul>
          )}
          {profile.hasMoreBadges && <p className="text-sm text-muted-foreground">{t("recentBadges")}</p>}
        </section>
      </main>
    </GamePageColumns>
  );
}
