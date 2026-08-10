"use client";

import { FormEvent, useState, useTransition } from "react";
import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/shared/loading-button";

/** Provides URL-backed account search with immediate pending feedback. */
export function AdminUserSearch({
  defaultValue,
}: {
  defaultValue: string;
}): React.ReactNode {
  const router = useRouter();
  const [search, setSearch] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const params = new URLSearchParams();
    const normalizedSearch = search.trim();
    if (normalizedSearch) params.set("search", normalizedSearch);

    startTransition(() => {
      router.push(
        params.size > 0
          ? `/admin/users?${params.toString()}`
          : "/admin/users",
      );
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-2 rounded-2xl border bg-card p-3 sm:flex-row"
      role="search"
    >
      <label htmlFor="admin-user-search" className="sr-only">
        Search users by name or email
      </label>
      <Input
        id="admin-user-search"
        type="search"
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        placeholder="Search name or email"
        className="h-11"
        maxLength={100}
      />
      <LoadingButton
        type="submit"
        isPending={isPending}
        pendingLabel="Searching"
        className="sm:min-w-32"
      >
        <SearchIcon aria-hidden="true" />
        Search
      </LoadingButton>
    </form>
  );
}
