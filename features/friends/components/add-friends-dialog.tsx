"use client";

/** Directory search is explicit, paginated and isolated from the private list's URL/filter. */
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { UserPlusIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/shared/loading-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { showActionError } from "@/lib/errors/show-action-error";
import type { FriendListPlayer } from "@/types/player-social.types";
import { searchPlayersAction } from "../actions/search-players.action";
import { FriendPlayerCard } from "./friend-player-card";

/** Keep the last submitted query for pagination; editing a draft never sends a request. */
export function AddFriendsDialog({
  initialQuery = "",
  initiallyOpen = false,
}: {
  initialQuery?: string;
  initiallyOpen?: boolean;
}): React.ReactNode {
  const t = useTranslations("PlayerSocial");
  const [open, setOpen] = useState(initiallyOpen);
  const [query, setQuery] = useState(initialQuery);
  const [submitted, setSubmitted] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<FriendListPlayer[]>([]);
  const [searched, setSearched] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [pending, startTransition] = useTransition();

  /** A failed lookup retains existing results and uses the standard persistent error feedback. */
  function search(value: string, requestedPage: number): void {
    startTransition(async () => {
      try {
        const result = await searchPlayersAction({
          q: value,
          page: requestedPage,
        });
        if (!result.success) {
          showActionError(result);
          return;
        }
        if (!result.data) return;
        setResults(result.data.players);
        setHasNext(result.data.hasNext);
        setSubmitted(value);
        setPage(requestedPage);
        setSearched(true);
        toast.success(result.message);
      } catch {
        toast.error(t("errors.failed"), { duration: Infinity });
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        className="min-h-11"
        onClick={() => setOpen(true)}
      >
        <UserPlusIcon aria-hidden="true" />
        {t("addFriends")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader className="pr-14">
            <DialogTitle>{t("addFriends")}</DialogTitle>
            <DialogDescription>{t("searchHelp")}</DialogDescription>
          </DialogHeader>
          <form
            role="search"
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              search(query.trim(), 1);
            }}
          >
            <label className="min-w-0">
              <span className="sr-only">{t("searchLabel")}</span>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                minLength={2}
                maxLength={50}
                required
                disabled={pending}
                className="min-h-11"
                placeholder={t("searchLabel")}
              />
            </label>
            <LoadingButton
              type="submit"
              isPending={pending}
              pendingLabel={t("searching")}
              className="min-h-11"
            >
              <SearchIcon aria-hidden="true" />
              {t("search")}
            </LoadingButton>
          </form>
          <div aria-busy={pending} className="space-y-3">
            {results.map((player) => (
              <FriendPlayerCard
                key={player.publicId}
                player={player}
                onChanged={(operation) => {
                  // Directory cards survive a route refresh: update their local relationship
                  // immediately instead of leaving a stale Add/Accept control visible.
                  setResults((current) =>
                    operation === "block"
                      ? current.filter(
                          (entry) => entry.publicId !== player.publicId,
                        )
                      : current.map((entry) =>
                          entry.publicId !== player.publicId
                            ? entry
                            : {
                                ...entry,
                                relationship:
                                  operation === "request"
                                    ? "outgoing"
                                    : operation === "accept"
                                      ? "friends"
                                      : "none",
                              },
                        ),
                  );
                }}
              />
            ))}
            {searched && results.length === 0 && (
              <p role="status" className="rounded-card bg-muted p-4">
                {t("empty.search")}
              </p>
            )}
          </div>
          {searched && (
            <div className="flex justify-between gap-3">
              <Button
                variant="secondary"
                className="min-h-11"
                disabled={pending || page === 1}
                onClick={() => search(submitted, page - 1)}
              >
                {t("previous")}
              </Button>
              <Button
                variant="secondary"
                className="min-h-11"
                disabled={pending || !hasNext}
                onClick={() => search(submitted, page + 1)}
              >
                {t("next")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
