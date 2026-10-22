"use client";

/** Standalone Bible composition replaces game chrome only within /bible. */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { HomeIcon, BookOpenIcon, BookmarkIcon } from "lucide-react";
import { NavigationButton } from "@/components/shared/navigation-button";
import { Button } from "@/components/ui/button";
import { GameArtwork } from "@/components/shared/game-artwork";
import { PlayerAvatar } from "@/features/profile";
import { BibleHome } from "./bible-home";
import { BibleBooks } from "./bible-books";
import { BibleReader } from "./bible-reader";
import { BibleLibrary } from "./bible-library";
import { BibleSearchDialog } from "./bible-search-dialog";
import { bibleReferenceUrl } from "../lib/bible-reference";
import { BIBLE_BOOKS } from "../data/bible-catalog";
import {
  bibleReferenceSchema,
  type BibleReference,
} from "../schemas/bible.schema";
import type { PlayerShellSummary } from "@/features/player-shell/types/player-shell.types";
import "./bible.css";

/** Session tabs use canonical references; browser history supports deep links without extra private reads. */
export function BibleWorkspace({
  initialReference,
  translation,
  authors,
  player,
}: {
  initialReference: BibleReference | null;
  translation: BibleReference["translation"];
  authors: { id: string; name: string }[];
  player: PlayerShellSummary;
}): React.ReactNode {
  const t = useTranslations("Bible");
  const initial = initialReference ?? {
    book: "GEN",
    chapter: 1,
    verse: 1,
    translation,
  };
  const [reference, setReference] = useState<BibleReference>(initial);
  const [tabs, setTabs] = useState<BibleReference[]>([initial]);
  const [screen, setScreen] = useState<"home" | "read" | "saved" | "books">(
    initialReference ? "read" : "home",
  );
  const [testament, setTestament] = useState<"old" | "new">("old");

  function openPassage(value: BibleReference): void {
    const parsed = bibleReferenceSchema.safeParse(value);
    if (!parsed.success) {
      toast.error(t("invalid"), { duration: Infinity });
      return;
    }
    setReference(parsed.data);
    setTabs((current) => {
      const matching = current.findIndex(
        (item) =>
          item.book === value.book &&
          item.chapter === value.chapter &&
          item.translation === value.translation,
      );
      if (matching >= 0)
        return current.map((item, index) =>
          index === matching ? parsed.data : item,
        );
      // Eight open chapter tabs keep touch navigation bounded. Oldest tabs close first;
      // saved marks are independent and are never removed with a reading tab.
      return [...current.slice(-7), parsed.data];
    });
    setScreen("read");
    window.history.replaceState(null, "", bibleReferenceUrl(parsed.data));
  }

  useEffect(() => {
    function restore(): void {
      const params = new URLSearchParams(window.location.search);
      const parsed = bibleReferenceSchema.safeParse({
        book: params.get("book"),
        chapter: Number(params.get("chapter")),
        verse: Number(params.get("verse") ?? 1),
        translation: params.get("translation") ?? translation,
      });
      if (parsed.success) {
        setReference(parsed.data);
        setTabs([parsed.data]);
        setScreen("read");
      } else setScreen("home");
    }
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [translation]);

  function navigate(value: "home" | "read" | "saved"): void {
    setScreen(value);
    window.history.replaceState(
      null,
      "",
      value === "read" ? bibleReferenceUrl(reference) : "/bible",
    );
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="bible-workspace min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 pb-28 sm:px-6">
        <header className="mb-5 flex items-center justify-between gap-3 border-b border-border py-4">
          <div className="flex items-center gap-2">
            <GameArtwork name="bibleOpen" className="size-12" sizes="48px" />
            <span className="font-heading text-3xl">{t("title")}</span>
          </div>
          <div className="flex items-center gap-3">
            <BibleSearchDialog
              translation={reference.translation}
              onOpen={openPassage}
            />
            <NavigationButton
              href="/profiles"
              pendingLabel={t("opening")}
              aria-label={t("profile")}
              variant="ghost"
              className="p-0"
            >
              <PlayerAvatar
                avatarKey={player.avatarKey ?? null}
                frameKey={player.avatarFrameKey ?? null}
                displayName={player.displayName ?? ""}
                size="md"
              />
            </NavigationButton>
          </div>
        </header>
        <NavigationButton
          href="/game"
          pendingLabel={t("opening")}
          variant="ghost"
          className="mb-4"
        >
          {t("backGame")}
        </NavigationButton>
        <main>
          {screen === "home" && (
            <BibleHome
              reference={reference}
              onOpen={openPassage}
              onBooks={(value) => {
                setTestament(value);
                setScreen("books");
                window.scrollTo({ top: 0 });
              }}
            />
          )}
          {screen === "books" && (
            <BibleBooks
              key={testament}
              testament={testament}
              reference={reference}
              onOpen={openPassage}
              onBack={() => navigate("home")}
            />
          )}
          {screen === "read" && (
            <BibleReader
              reference={reference}
              tabs={tabs}
              authors={authors}
              onOpen={openPassage}
              onBack={() => {
                setTestament(
                  BIBLE_BOOKS.find((book) => book.id === reference.book)
                    ?.testament === "new"
                    ? "new"
                    : "old",
                );
                setScreen("books");
                window.scrollTo({ top: 0 });
              }}
              onCloseTab={(index) => {
                const remaining = tabs.filter(
                  (_, itemIndex) => itemIndex !== index,
                );
                setTabs(remaining);
                if (
                  remaining.length &&
                  tabs[index].book === reference.book &&
                  tabs[index].chapter === reference.chapter &&
                  tabs[index].translation === reference.translation
                )
                  openPassage(remaining[remaining.length - 1]);
              }}
            />
          )}
          {screen === "saved" && <BibleLibrary onOpen={openPassage} />}
        </main>
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-xl grid-cols-3 gap-2 rounded-t-card border border-border bg-card/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm"
        aria-label={t("navigation")}
      >
        {(
          [
            { id: "home", Icon: HomeIcon },
            { id: "read", Icon: BookOpenIcon },
            { id: "saved", Icon: BookmarkIcon },
          ] as const
        ).map(({ id, Icon }) => (
          <Button
            key={id}
            variant={
              screen === id || (id === "home" && screen === "books")
                ? "default"
                : "ghost"
            }
            aria-current={
              screen === id || (id === "home" && screen === "books")
                ? "page"
                : undefined
            }
            onClick={() => navigate(id)}
            className="h-auto min-h-14 flex-col gap-1"
          >
            <Icon aria-hidden="true" />
            <span>{t(id)}</span>
          </Button>
        ))}
      </nav>
    </div>
  );
}
