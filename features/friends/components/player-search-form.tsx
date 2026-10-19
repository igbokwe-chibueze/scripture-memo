"use client";

/** Search is submitted explicitly, with immediate pending feedback and no polling. */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/shared/loading-button";

/** Keep search results in the URL so pagination and Back preserve the query. */
export function PlayerSearchForm({ initialQuery }: { initialQuery: string }): React.ReactNode {
  const t = useTranslations("PlayerSocial");
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(() => router.push(`/friends?tab=search&q=${encodeURIComponent(query.trim())}`));
      }}
      role="search"
    >
      <label className="min-w-0 flex-1">
        <span className="sr-only">{t("searchLabel")}</span>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchLabel")}
          minLength={2}
          maxLength={50}
          required
          autoComplete="off"
          className="min-h-12"
        />
      </label>
      <LoadingButton
        type="submit"
        isPending={pending}
        pendingLabel={t("searching")}
      >
        <SearchIcon aria-hidden="true" />
        {t("search")}
      </LoadingButton>
    </form>
  );
}
