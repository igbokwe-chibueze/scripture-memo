/** Authenticated portrait; private cards and controls are composed only for the owner. */
import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { UsersIcon } from "lucide-react";
import { getServerSession } from "@/lib/auth/session";
import { GamePageColumns } from "@/components/shared/game-page-columns";
import { NavigationButton } from "@/components/shared/navigation-button";
import { CountryFlag } from "@/components/shared/country-flag";
import { FriendControls } from "@/features/friends";
import {
  beaconLevelStartXp,
  beaconLevelFromXp,
} from "@/features/beacon/constants/beacon-progression";
import { PlayerAvatar } from "../components/player-avatar";
import { ProfileEditor } from "../components/profile-editor";
import { ProfileBadges } from "../components/profile-badges";
import { ProfileShareTools } from "../components/profile-share-tools";
import { ProfileQuickLinks } from "../components/profile-quick-links";
import { playerProfileRepository } from "../repositories/player-profile.repository";
import { publicProfileSchema } from "../schemas/public-profile.schema";

export const metadata: Metadata = {
  title: "Player profile | Scripture Memo",
  description: "A Scripture Memo learner's journey and achievements.",
  robots: { index: false, follow: false },
};

/** Authenticate and check block visibility before composing public or private sections. */
export async function MemberProfileView({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<React.ReactNode> {
  const parsed = publicProfileSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const session = await getServerSession();
  if (!session?.user)
    redirect(
      `/login?next=${encodeURIComponent(`/profiles/${parsed.data.publicId}`)}`,
    );
  const [profile, t, locale] = await Promise.all([
    playerProfileRepository.getProfile(session.user.id, parsed.data.publicId),
    getTranslations("PlayerSocial"),
    getLocale(),
  ]);
  if (!profile) notFound();
  const self = profile.relationship === "self";
  const number = (value: number): string => value.toLocaleString(locale);
  // Preserve the actual cumulative XP rules rather than copying concept numbers.
  const level = beaconLevelFromXp(profile.lifetimeBeaconXp);
  const required = beaconLevelStartXp(level + 1) - beaconLevelStartXp(level);
  const earned = profile.lifetimeBeaconXp - beaconLevelStartXp(level);
  const percent = Math.floor((earned / required) * 100);
  const country = profile.countryCode
    ? new Intl.DisplayNames(locale, { type: "region" }).of(profile.countryCode)
    : null;
  const metrics = [
    {
      label: t("streak"),
      value: profile.currentStreak,
      image: "flame-lit.png",
      tone: "border-reward-border/30 bg-reward-subtle",
      detail: t("bestStreak", { count: profile.bestStreak }),
    },
    {
      label: t("waypoints"),
      value: profile.completedWaypoints,
      image: "map.png",
      tone: "border-success-border/30 bg-success-subtle",
    },
    ...(profile.privateDetails
      ? [
          {
            label: t("hintsUsed"),
            value: profile.privateDetails.hintsUsed,
            image: "/images/oil-shop/hint-bulb-owner.png",
            tone: "border-info-border/30 bg-info-subtle",
          },
        ]
      : []),
    {
      label: t("masteredVerses"),
      value: profile.masteredVerses,
      image: "badges.png",
      tone: "border-reward-border/30 bg-reward-subtle",
    },
  ];
  return (
    <GamePageColumns contextPanel={<ProfileQuickLinks />}>
      <main className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6">
        <header className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-heading text-4xl font-bold sm:text-5xl">
              {t("profileHeading")}
            </h1>
            {self && (
              <div className="grid gap-2">
                <ProfileEditor profile={profile} />
                <ProfileShareTools publicId={profile.publicId} />
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="relative">
              <PlayerAvatar
                avatarKey={profile.avatarKey}
                frameKey={profile.avatarFrameKey}
                displayName={profile.displayName}
                size="xl"
                className="size-36 sm:size-44"
                loading="eager"
              />
              {self && (
                <div className="absolute right-0 bottom-0">
                  <ProfileEditor profile={profile} iconOnly />
                </div>
              )}
            </div>
            <div className="min-w-0 max-w-full space-y-1">
              <h2 className="break-words font-heading text-3xl font-bold sm:text-4xl">
                {profile.displayName}
              </h2>
              <p className="break-all text-lg text-primary">
                {profile.username ? `@${profile.username}` : t("noUsername")}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {profile.countryCode && (
                <span className="flex items-center gap-2">
                  <CountryFlag
                    countryCode={profile.countryCode}
                    label={country ?? profile.countryCode}
                    className="h-5 w-7"
                  />
                  {country}
                </span>
              )}
              <p>
                {t("joined", {
                  date: new Intl.DateTimeFormat(locale, {
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  }).format(new Date(profile.joinedAt)),
                })}
              </p>
            </div>
          </div>
          {!self && (
            <FriendControls
              publicId={profile.publicId}
              relationship={profile.relationship}
              displayName={profile.displayName}
            />
          )}
          {profile.privateDetails && (
            <div className="grid grid-cols-2 gap-3">
              <NavigationButton
                href="/friends"
                pendingLabel={t("opening")}
                variant="secondary"
                prefetch={false}
                className="min-h-14 whitespace-normal px-2 text-center"
              >
                <UsersIcon aria-hidden="true" />
                {t("friendCount", { count: profile.privateDetails.friends })}
              </NavigationButton>
              <NavigationButton
                href="/fellowships"
                pendingLabel={t("opening")}
                variant="secondary"
                prefetch={false}
                className="min-h-14 whitespace-normal px-2 text-center"
              >
                <UsersIcon aria-hidden="true" />
                {t("fellowshipCount", {
                  count: profile.privateDetails.fellowships,
                })}
              </NavigationButton>
            </div>
          )}
        </header>
        <section
          className="space-y-3 rounded-card border border-border bg-card p-4"
          aria-label={t("beaconLevel")}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
              <Image
                src="/images/game-ui/beacon.png"
                alt=""
                width={36}
                height={36}
              />
              {t("levelNumber", { level })}
            </h2>
            <p>{t("totalXp", { count: profile.lifetimeBeaconXp })}</p>
          </div>
          <div className="relative">
            <progress
              value={earned}
              max={required}
              aria-label={t("levelProgress")}
              className="block h-7 w-full appearance-none overflow-hidden rounded-full bg-muted [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary"
            />
            <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm font-bold">
              <span className="rounded-full bg-card px-2 text-foreground">
                {percent}%
              </span>
            </span>
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
            <span>
              {t("levelXp", {
                earned: number(earned),
                required: number(required),
                level: level + 1,
              })}
            </span>
            <span>{t("xpRemaining", { count: required - earned })}</span>
          </div>
        </section>
        <section className="space-y-3" aria-labelledby="profile-journey">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="profile-journey"
              className="font-heading text-2xl font-bold"
            >
              {t("profileJourney")}
            </h2>
            {self && (
              <NavigationButton
                href="/stats"
                pendingLabel={t("opening")}
                variant="secondary"
                className="min-h-11"
                prefetch={false}
              >
                {t("viewAllStats")}
              </NavigationButton>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-3">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className={`flex min-w-0 items-center gap-2 rounded-card border p-3 ${metric.tone}`}
              >
                <Image
                  src={
                    metric.image.startsWith("/")
                      ? metric.image
                      : `/images/game-ui/${metric.image}`
                  }
                  alt=""
                  width={52}
                  height={52}
                  className="size-10 shrink-0 object-contain sm:size-12"
                />
                <div className="min-w-0">
                  <dt className="text-sm">{metric.label}</dt>
                  <dd className="break-words font-heading text-3xl font-bold">
                    {number(metric.value)}
                  </dd>
                  {metric.detail && (
                    <dd className="text-xs text-muted-foreground">
                      {metric.detail}
                    </dd>
                  )}
                </div>
              </div>
            ))}
          </dl>
        </section>
        <ProfileBadges
          badges={profile.badges}
          hasMore={profile.hasMoreBadges}
        />
      </main>
    </GamePageColumns>
  );
}
