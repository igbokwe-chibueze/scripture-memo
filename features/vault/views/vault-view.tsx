import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import {
  AwardIcon,
  FlameIcon,
  GemIcon,
  LightbulbIcon,
  MapIcon,
  TrophyIcon,
  VaultIcon,
} from "lucide-react";
import { requireServerSession } from "@/lib/auth/session";
import { StatCard } from "@/components/shared/stat-card";
import { VaultLibrary } from "@/features/vault/components/vault-library";
import { vaultRepository } from "@/features/vault/repositories/vault.repository";

export const metadata: Metadata = {
  title: "Vault | Scripture Memo",
  description: "Review your private Scripture mastery library and progress archive.",
  robots: { index: false, follow: false },
};

/** Loads the authenticated learner's complete private progress archive. */
export async function VaultView(): Promise<React.ReactNode> {
  const t = await getTranslations("Vault");
  const session = await requireServerSession();
  const data = await vaultRepository.getLibrary(session.user.id);

  return (
    <main className="min-h-dvh bg-linear-to-b from-violet-100/70 via-background to-amber-50 px-4 py-6 text-foreground dark:from-violet-950 dark:via-slate-950 dark:to-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="overflow-hidden rounded-[2rem] border border-violet-300/20 bg-linear-to-br from-violet-700 via-indigo-800 to-slate-950 p-6 text-white shadow-xl sm:p-9">
          <VaultIcon className="size-11 text-amber-300" aria-hidden="true" />
          <p className="mt-5 text-xs font-black tracking-[0.2em] text-violet-200 uppercase">
            {t("permanentCollection")}
          </p>
          <h1 className="mt-2 font-heading text-4xl font-black sm:text-5xl">{t("title")}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-violet-100">
            {t("longDescription")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/game/map" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-4 font-black hover:bg-white/15">
              <MapIcon className="size-4" aria-hidden="true" />
              {t("returnTrail")}
            </Link>
            <Link href="/vault/badges" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-300 px-4 font-black text-slate-950 hover:bg-amber-200">
              <AwardIcon className="size-4" aria-hidden="true" />
              {t("badgeCollection")}
            </Link>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label={t("summary")}>
          <StatCard label={t("waypoints")} value={data.summary.completedWaypoints} icon={<MapIcon />} />
          <StatCard label={t("glowPoints")} value={data.summary.glowPoints} icon={<GemIcon />} />
          <StatCard label={t("currentStreak")} value={data.summary.currentStreak} icon={<FlameIcon />} />
          <StatCard label={t("bestStreak")} value={data.summary.bestStreak} icon={<TrophyIcon />} />
          <StatCard
            className="col-span-2 lg:col-span-1"
            label={t("hintsLeft")}
            value={data.summary.hintsRemaining}
            supportingText={t("hintsUsed", { count: data.summary.totalHintsUsed })}
            icon={<LightbulbIcon />}
          />
        </section>

        <div className="mt-9">
          <VaultLibrary data={data} />
        </div>
      </div>
    </main>
  );
}
