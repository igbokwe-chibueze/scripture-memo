"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { SearchIcon } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { showActionError } from "@/lib/errors/show-action-error";
import { toggleSanctuaryFavoriteAction } from "@/features/sanctuary/actions/toggle-sanctuary-favorite.action";
import { VaultVerseCard } from "./vault-verse-card";
import { collectVaultVerses, getVaultStatus } from "../lib/vault-library";
import type { VaultLibraryData } from "../types/vault.types";
import styles from "./vault.module.css";

/** Instant local search/filtering over authorized, server-redacted verse data.
 * Translation comes exclusively from Settings. Packs intentionally has no
 * catalogue or invented progress until the owner introduces player packs.
 */
export function VaultLibrary({ data }: { data: VaultLibraryData }): React.ReactNode {
  const t = useTranslations("Vault");
  const [tab, setTab] = useState("verses");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [pendingVerse, setPendingVerse] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const verses = collectVaultVerses(data).map((verse) => ({
    ...verse,
    isFavorite: favorites[verse.verseId] ?? verse.isFavorite,
  }));
  const search = query.trim().toLocaleLowerCase();
  const visible = verses.filter((verse) => {
    const matchesStatus = status === "all" ||
      (status === "favorites" ? verse.isFavorite : getVaultStatus(verse) === status);
    // Locked text is null at the repository boundary, including during search.
    const matchesSearch = (verse.reference + " " + (verse.text ?? ""))
      .toLocaleLowerCase().includes(search);
    return matchesStatus && matchesSearch;
  });
  const packs = tab === "packs";
  const filtered = Boolean(search) || status !== "all";

  /** Server action retains Sanctuary authorization; update only after success. */
  const toggleFavorite = (verseId: string): void => {
    setPendingVerse(verseId);
    startTransition(async () => {
      try {
        const result = await toggleSanctuaryFavoriteAction({ verseId });
        if (!result.success) {
          showActionError(result);
          return;
        }
        if (result.data) {
          const savedFavorite = result.data.isFavorite;
          setFavorites((previous) => ({ ...previous, [verseId]: savedFavorite }));
        }
        toast.success(result.message, { duration: 4_000 });
      } catch {
        toast.error(t("favoriteError"), { duration: Infinity });
      } finally {
        setPendingVerse(null);
      }
    });
  };

  return (
    <section className={styles.library} aria-label={t("libraryLabel")}>
      <div className={styles.tabs} role="group" aria-label={t("libraryLabel")}>
        {["verses", "packs"].map((value) => (
          <Button
            key={value}
            variant={tab === value ? "default" : "ghost"}
            className={styles.tab}
            aria-pressed={tab === value}
            onClick={() => { setTab(value); setQuery(""); setStatus("all"); }}
          >
            {t(value === "verses" ? "versesTab" : "packsTab")}
          </Button>
        ))}
      </div>
      <label className={styles.search}>
        <SearchIcon className="size-6" aria-hidden="true" />
        <span className="sr-only">{t(packs ? "searchPacks" : "searchVerses")}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t(packs ? "searchPacks" : "searchVerses")}
        />
      </label>
      <div className={styles.toolbar}>
        <p className="font-heading text-xl font-bold" aria-live="polite">
          {t(packs ? "packCount" : "verseCount", { count: packs ? 0 : visible.length })}
        </p>
        <label>
          <span className="sr-only">{t("statusFilter")}</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">{t(packs ? "allPacks" : "allVerses")}</option>
            <option value="inProgress">{t("inProgress")}</option>
            <option value="completed">{t("completed")}</option>
            {!packs && <option value="mastered">{t("mastered")}</option>}
            {!packs && <option value="favorites">{t("favorites")}</option>}
          </select>
        </label>
      </div>
      {!packs && visible.length > 0 ? (
        <div className={styles.cards}>
          {visible.map((verse) => (
            <VaultVerseCard
              key={verse.verseId}
              verse={verse}
              sanctuaryHref={"/sanctuary/" + verse.verseId}
              isPending={isPending && pendingVerse === verse.verseId}
              favoriteDisabled={isPending}
              onFavorite={() => toggleFavorite(verse.verseId)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <Image src="/images/game-ui/bible-open.png" alt="" width={180} height={140} />
          <h2 className="font-heading text-2xl font-bold">{t(packs ? "packsEmpty" : "nothingYet")}</h2>
          <p className="text-muted-foreground">{t(packs ? "packsEmptyDescription" : "emptyDescription")}</p>
          {filtered && (
            <Button variant="secondary" className="min-h-11 px-5" onClick={() => { setQuery(""); setStatus("all"); }}>
              {t("clearFilters")}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
