import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GamePageColumns } from "@/components/shared/game-page-columns";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { LeaderboardBoard } from "@/features/leaderboard/components/leaderboard-board";
import { LeaderboardContextPanel } from "@/features/leaderboard/components/leaderboard-context-panel";
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
    <main className="min-h-dvh bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklch,var(--primary),transparent_78%),transparent_32%),linear-gradient(to_bottom,color-mix(in_oklch,var(--background),white_3%),var(--background))] py-3 sm:py-4">
      <ResponsiveContainer size="xl">
        <GamePageColumns
          contextPanel={<LeaderboardContextPanel data={data} />}
        >
          <h1 className="mb-3 font-heading text-4xl font-bold sm:text-5xl">
            {t("title")}
          </h1>
          <LeaderboardBoard data={data} initialTime={data.generatedAt} />
        </GamePageColumns>
      </ResponsiveContainer>
    </main>
  );
}
