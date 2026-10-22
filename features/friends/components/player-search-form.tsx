"use client";

/** Search is submitted explicitly, with immediate pending feedback and no polling. */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/shared/loading-button";

/** Keep search results in the URL so pagination and Back preserve the query. */
export function PlayerSearchForm({
  initialQuery,
  tab = "search",
}: {
  initialQuery: string;
  tab?: "search" | "friends" | "requests" | "sent" | "blocked";
}): React.ReactNode {
  const t = useTranslations("PlayerSocial");
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(() =>
          router.push(
            `/friends?tab=${tab}&q=${encodeURIComponent(query.trim())}`,
            { scroll: false },
          ),
        );
      }}
      role="search"
    >
      <label className="min-w-0 flex-1">
        <span className="sr-only">
          {tab === "search" ? t("searchLabel") : t(`listSearch.${tab}`)}
        </span>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            tab === "search" ? t("searchLabel") : t(`listSearch.${tab}`)
          }
          minLength={tab === "search" ? 2 : undefined}
          maxLength={50}
          required={tab === "search"}
          autoComplete="off"
          className="min-h-12"
        />
      </label>
      <LoadingButton
        className="min-h-12 min-w-12"
        type="submit"
        isPending={pending}
        pendingLabel={t("searching")}
      >
        <SearchIcon aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">{t("search")}</span>
      </LoadingButton>
    </form>
  );
}
