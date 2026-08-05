import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TrophyIcon } from "lucide-react";
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
function parseScope(
  value: string | undefined,
): "league" | "country" | "fellowship" | "all-time" {
  if (
    value === "country" ||
    value === "fellowship" ||
    value === "all-time"
  ) {
    return value;
  }
  return "league";
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
    <main className="min-h-dvh bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklch,var(--primary),transparent_78%),transparent_32%),linear-gradient(to_bottom,color-mix(in_oklch,var(--background),white_3%),var(--background))] py-5 sm:py-9">
      <ResponsiveContainer size="lg">
        <header className="flex items-center justify-center gap-3 py-3 text-center sm:py-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-400 text-amber-950 shadow-[0_5px_0_rgb(120_53_15/0.65)]">
            <TrophyIcon className="size-6" aria-hidden="true" />
          </span>
          <div className="text-left">
            <h1 className="font-heading text-3xl leading-tight font-black sm:text-4xl">
            {t("title")}
            </h1>
            <p className="text-sm font-semibold text-muted-foreground">
              {t("eyebrow")}
            </p>
          </div>
        </header>

        <div className="mt-3">
          <LeaderboardBoard data={data} />
        </div>
      </ResponsiveContainer>
    </main>
  );
}
