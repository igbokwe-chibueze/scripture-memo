"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookHeartIcon,
  BookOpenCheckIcon,
  FilterIcon,
  HeartIcon,
  MapPinIcon,
  PlayIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { showActionError } from "@/lib/errors/show-action-error";
import { startVaultReplayAction } from "@/features/vault/actions/start-vault-replay.action";
import type {
  VaultLibraryData,
  VaultVerseItem,
} from "@/features/vault/types/vault.types";

/** Reusable private verse card with an optional server-authorized replay action. */
function VerseCard({
  verse,
  canReplay,
}: {
  verse: VaultVerseItem;
  canReplay: boolean;
}): React.ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const replay = (): void => {
    startTransition(async () => {
      const result = await startVaultReplayAction({ verseId: verse.verseId });
      if (!result.success) {
        showActionError(result);
        return;
      }
      if (!result.data) {
        toast.error("The Vault replay did not return a session.", {
          duration: Infinity,
        });
        return;
      }
      toast.success(result.message, { duration: 4_000 });
      router.push(`/game/sessions/${result.data.sessionId}`);
    });
  };

  return (
    <article className="rounded-3xl border border-violet-500/15 bg-card/90 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.14em] text-violet-700 uppercase dark:text-violet-300">
            {verse.translation}
          </p>
          <h3 className="mt-1 font-heading text-xl font-black">{verse.reference}</h3>
        </div>
        {verse.isFavorite && <HeartIcon className="size-5 fill-rose-500 text-rose-500" aria-label="Favorite" />}
      </div>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">
        {verse.text}
      </p>
      {verse.packNames.length > 0 && (
        <p className="mt-3 text-xs font-bold text-muted-foreground">
          {verse.packNames.join(" · ")}
        </p>
      )}
      {canReplay && (
        <Button
          type="button"
          className="mt-5 min-h-11 w-full rounded-xl bg-violet-600 font-black text-white hover:bg-violet-500"
          disabled={isPending}
          onClick={replay}
        >
          <PlayIcon data-icon="inline-start" aria-hidden="true" />
          {isPending ? "Opening…" : "Replay from Vault"}
        </Button>
      )}
    </article>
  );
}

/** Client-side filters keep private Vault browsing instant without new data reads. */
export function VaultLibrary({ data }: { data: VaultLibraryData }): React.ReactNode {
  const [translation, setTranslation] = useState("ALL");
  const [pack, setPack] = useState("ALL");
  const filterVerses = (verses: VaultVerseItem[]): VaultVerseItem[] =>
    verses.filter(
      (verse) =>
        (translation === "ALL" ||
          verse.availableTranslations.includes(
            translation as VaultVerseItem["translation"],
          )) &&
        (pack === "ALL" || verse.packSlugs.includes(pack)),
    );
  const mastered = useMemo(
    () => filterVerses(data.masteredVerses),
    // The local filters and immutable server payload fully determine this list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.masteredVerses, pack, translation],
  );
  const favorites = useMemo(
    () => filterVerses(data.favoriteVerses),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.favoriteVerses, pack, translation],
  );

  return (
    <div className="space-y-9">
      <section className="rounded-2xl border border-border bg-card/70 p-4">
        <div className="flex items-center gap-2 font-black">
          <FilterIcon className="size-4" aria-hidden="true" />
          Library filters
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-bold text-muted-foreground">
            Translation
            <select
              className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
              value={translation}
              onChange={(event) => setTranslation(event.currentTarget.value)}
            >
              <option value="ALL">All translations</option>
              {data.availableTranslations.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-muted-foreground">
            Pack
            <select
              className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
              value={pack}
              onChange={(event) => setPack(event.currentTarget.value)}
            >
              <option value="ALL">All packs</option>
              {data.packs.map((value) => (
                <option key={value.slug} value={value.slug}>{value.name}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section aria-labelledby="mastered-heading">
        <div className="flex items-center gap-3">
          <BookOpenCheckIcon className="size-7 text-emerald-500" aria-hidden="true" />
          <div>
            <h2 id="mastered-heading" className="font-heading text-2xl font-black">Mastered verses</h2>
            <p className="text-sm text-muted-foreground">All four Journey Stages complete.</p>
          </div>
        </div>
        {mastered.length > 0 ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {mastered.map((verse) => <VerseCard key={verse.verseId} verse={verse} canReplay />)}
          </div>
        ) : (
          <EmptyState
            className="mt-4"
            icon={<BookOpenCheckIcon />}
            title={data.masteredVerses.length ? "No verses match these filters" : "Your mastery shelf is waiting"}
            description={data.masteredVerses.length ? "Try another translation or pack." : "Complete Learn, Recall, Strengthen, and Master for a verse to place it here."}
          />
        )}
      </section>

      <section aria-labelledby="progress-heading">
        <div className="flex items-center gap-3">
          <MapPinIcon className="size-7 text-amber-500" aria-hidden="true" />
          <h2 id="progress-heading" className="font-heading text-2xl font-black">In-progress waypoints</h2>
        </div>
        {data.inProgressWaypoints.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.inProgressWaypoints.map((waypoint) => (
              <Link
                key={waypoint.waypointId}
                href={`/game/waypoints/${waypoint.waypointId}`}
                className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 transition hover:-translate-y-0.5 hover:bg-amber-500/10"
              >
                <p className="text-xs font-black text-amber-700 uppercase dark:text-amber-300">Waypoint {waypoint.number} · {waypoint.journeyStage}</p>
                <h3 className="mt-1 font-heading text-lg font-black">{waypoint.reference}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{waypoint.completedDays} of 3 flames kindled</p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState className="mt-4" icon={<MapPinIcon />} title="No active waypoint" description="Your next unlocked trail challenge will appear here." />
        )}
      </section>

      <section aria-labelledby="favorites-heading">
        <div className="flex items-center gap-3">
          <BookHeartIcon className="size-7 text-rose-500" aria-hidden="true" />
          <h2 id="favorites-heading" className="font-heading text-2xl font-black">Favorite verses</h2>
        </div>
        {favorites.length > 0 ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {favorites.map((verse) => <VerseCard key={verse.verseId} verse={verse} canReplay={false} />)}
          </div>
        ) : (
          <EmptyState className="mt-4" icon={<HeartIcon />} title={data.favoriteVerses.length ? "No favorites match these filters" : "No favorite verses yet"} description={data.favoriteVerses.length ? "Try another translation or pack." : "Favorite controls arrive with the Sanctuary in Phase 24."} />
        )}
      </section>
    </div>
  );
}
