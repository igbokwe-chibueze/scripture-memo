"use client";

import { CircleHelpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { BIBLE_BOOKS } from "../data/bible-catalog";

/** Static group definitions need no server action or provider/database request.
 * Acts is explained separately from the Old Testament historical collection. */
export function BibleGroupHelp({
  group,
  testament,
}: {
  group: string;
  testament: "old" | "new";
}): React.ReactNode {
  const t = useTranslations("Bible");
  const key = group === "history" && testament === "new" ? "acts" : group;
  const name = t(`groups.${key}`);
  const books = BIBLE_BOOKS.filter(
    (book) => book.group === group && book.testament === testament,
  );
  return (
    <ResponsiveDialog
      title={name}
      description={t(`groupDefinitions.${key}`)}
      closeLabel={t("closeHelp")}
      trigger={
        <Button
          variant="ghost"
          size="icon-lg"
          className="size-11 shrink-0 text-primary"
          aria-label={t("aboutGroup", { group: name })}
        >
          <CircleHelpIcon aria-hidden="true" className="size-5" />
        </Button>
      }
    >
      <p>{t(`groupExplanations.${key}`)}</p>
      <div className="rounded-control bg-muted/50 p-3">
        <p className="mb-1 font-bold">
          {t("bookCount", { count: books.length })}
        </p>
        <p className="text-sm text-muted-foreground">
          {books.map((book) => book.name).join(", ")}
        </p>
      </div>
    </ResponsiveDialog>
  );
}
