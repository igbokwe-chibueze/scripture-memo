import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SparklesIcon, TrophyIcon } from "lucide-react";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { LeaderboardBoard } from "@/features/leaderboard/components/leaderboard-board";
import { leaderboardRepository } from "@/features/leaderboard/repositories/leaderboard.repository";
import { requireServerSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "The Great Beacon | Scripture Memo",
  description: "View Scripture Memo player rankings.",
  robots: { index: false, follow: false },
};

type LeaderboardSearchParameters = {
  scope?: string;
  fellowship?: string;
  page?: string;
};

/** Narrows URL input to one supported ranking scope. */
function parseScope(value: string | undefined): "global" | "country" | "fellowship" {
  if (value === "country" || value === "fellowship") return value;
  return "global";
}

/** Prevents malformed page input from reaching repository offsets. */
function parsePage(value: string | undefined): number {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

/**
 * Server-rendered Great Beacon composition. The repository returns only public
 * display fields; badge evaluation receives the server-derived global rank.
 */
export async function LeaderboardView({
  searchParams,
}: {
  searchParams: Promise<LeaderboardSearchParameters>;
}): Promise<React.ReactNode> {
  const session = await requireServerSession();
  const parameters = await searchParams;
  const scope = parseScope(parameters.scope);

  const [data, t] = await Promise.all([
    leaderboardRepository.getPageData({
      userId: session.user.id,
      scope,
      fellowshipId: parameters.fellowship?.slice(0, 64) ?? null,
      page: parsePage(parameters.page),
    }),
    getTranslations("Leaderboard"),
  ]);

  return (
    <main className="min-h-dvh bg-linear-to-b from-amber-500/10 via-background to-violet-500/10 py-7 sm:py-10">
      <ResponsiveContainer size="md">
        <header className="rounded-[2rem] border border-amber-400/30 bg-linear-to-br from-amber-300/20 via-card to-violet-400/10 p-5 shadow-xl sm:p-8">
          <span className="grid size-14 place-items-center rounded-2xl bg-amber-400 text-amber-950 shadow-[0_5px_0_rgb(120_53_15/0.65)]">
            <TrophyIcon className="size-7" aria-hidden="true" />
          </span>
          <p className="mt-5 flex items-center gap-2 text-xs font-black tracking-[0.2em] text-amber-700 uppercase dark:text-amber-300">
            <SparklesIcon className="size-4" aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 font-heading text-4xl leading-tight font-black sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            {t("description")}
          </p>
        </header>

        <div className="mt-6">
          <LeaderboardBoard data={data} />
        </div>
      </ResponsiveContainer>
    </main>
  );
}
