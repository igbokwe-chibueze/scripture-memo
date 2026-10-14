"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/shared/loading-button";
import { BLOG_CATEGORIES } from "../constants/blog-categories";
import type { BlogSearch } from "../schemas/blog-search.schema";
import styles from "./blog.module.css";

/** Search only on explicit submission, with immediate feedback and no polling. */
export function BlogSearchForm({ search }: { search: BlogSearch }): React.ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <form
      action="/blog"
      method="get"
      role="search"
      className={styles.searchForm}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const params = new URLSearchParams();
        params.set("q", String(data.get("q") ?? "").trim());
        params.set("category", String(data.get("category") ?? "ALL"));
        startTransition(() => router.push(`/blog?${params.toString()}`));
      }}
    >
      <div className={styles.field}>
        <label htmlFor="blog-query">What would you like to know?</label>
        <Input
          id="blog-query"
          name="q"
          type="search"
          maxLength={100}
          defaultValue={search.q}
          placeholder="Try Beacon Levels, cooldowns, or hints"
          className="min-h-12"
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="blog-category">Category</label>
        <select id="blog-category" name="category" defaultValue={search.category} className={styles.select}>
          <option value="ALL">All articles</option>
          {Object.entries(BLOG_CATEGORIES).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <LoadingButton type="submit" isPending={isPending} pendingLabel="Searching" className="min-h-12 px-6">
        Search
      </LoadingButton>
    </form>
  );
}
