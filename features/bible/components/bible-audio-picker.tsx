"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { Button } from "@/components/ui/button";

/** A compact pill opens the shared animated drawer/modal. Choosing an option
 * highlights it and closes the surface, returning focus to its trigger. */
export function BibleAudioPicker({
  title,
  description,
  value,
  options,
  onChoose,
  align,
}: {
  title: string;
  description: string;
  value: string;
  options: readonly string[];
  onChoose: (value: string) => void;
  align: "left" | "right";
}): React.ReactNode {
  const t = useTranslations("Bible");
  const [open, setOpen] = useState(false);
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={setOpen}
      title={title}
      description={description}
      closeLabel={t("closeHelp")}
      trigger={
        <Button
          variant="outline"
          className={`h-11 min-h-11 w-16 min-w-0 max-w-full rounded-full px-2 text-[0.7rem] ${align === "left" ? "justify-self-start" : "justify-self-end"}`}
          aria-label={`${title}: ${value}`}
          title={value}
        >
          <span className="truncate">{value}</span>
        </Button>
      }
    >
      <div className="flex flex-wrap gap-3">
        {options.map((option) => (
          <Button
            key={option}
            variant={value === option ? "default" : "outline"}
            aria-pressed={value === option}
            className="min-h-11 min-w-16 max-w-full rounded-full px-4 whitespace-normal"
            onClick={() => {
              onChoose(option);
              setOpen(false);
            }}
          >
            {option}
          </Button>
        ))}
      </div>
      {align === "right" && (
        <p className="text-xs text-muted-foreground">
          {t("audioAttribution")} ·{" "}
          <a
            className="underline"
            href="https://bible.helloao.org/docs/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Free Use Bible API
          </a>
        </p>
      )}
    </ResponsiveDialog>
  );
}
