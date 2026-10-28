import type { Metadata } from "next";
import { requireServerSession } from "@/lib/auth/session";
import { getCachedUserSettings } from "@/features/settings/lib/get-cached-user-settings";
import { getPlayerShellSummary } from "@/features/player-shell/lib/get-player-shell-summary";
import { loadBibleCommentaries } from "../lib/bible-provider";
import { bibleReferenceSchema } from "../schemas/bible.schema";
import { BibleWorkspace } from "../components/bible-workspace";
import { bibleSelectionFromQuery } from "../lib/bible-reference";

/** Bible reading remains authenticated and is never indexed with private marks. */
export const metadata: Metadata = {
  title: "Bible | Scripture Memo",
  description:
    "Read Scripture, explore original-language words and commentaries, and save passages privately.",
  robots: { index: false, follow: false },
};

/** The reader starts with Settings translation; temporary changes never rewrite Settings. */
export async function BibleView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactNode> {
  const session = await requireServerSession();
  const [settings, player, params, authors] = await Promise.all([
    getCachedUserSettings(session.user.id),
    getPlayerShellSummary(),
    searchParams,
    // The UI retains author options during a temporary upstream catalogue outage.
    loadBibleCommentaries().catch(() => [
      { id: "matthew-henry", name: "Matthew Henry" },
      { id: "john-gill", name: "John Gill" },
      { id: "adam-clarke", name: "Adam Clarke" },
      { id: "jamieson-fausset-brown", name: "Jamieson-Fausset-Brown" },
      { id: "john-calvin", name: "John Calvin" },
      { id: "keil-delitzsch", name: "Keil and Delitzsch" },
      { id: "tyndale", name: "Tyndale Open Study Notes" },
    ]),
  ]);
  const preferred = settings?.preferredTranslation;
  const translation =
    preferred === "WEB" || preferred === "BSB" ? preferred : "KJV";
  const parsed = bibleReferenceSchema.safeParse({
    book: params.book,
    chapter: Number(params.chapter),
    verse: Number(params.verse ?? 1),
    translation: params.translation ?? translation,
    selection: bibleSelectionFromQuery(params.selection),
  });
  return (
    <BibleWorkspace
      initialReference={parsed.success ? parsed.data : null}
      translation={translation}
      authors={authors}
      player={player}
    />
  );
}
