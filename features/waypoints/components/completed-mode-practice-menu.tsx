"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { LoaderCircleIcon, RotateCcwIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GAME_MODE_ORDER } from "@/lib/constants";
import type { DayLevel, GameMode } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

/** Offers only server-confirmed completed modes from one completed challenge day. */
export function CompletedModePracticeMenu({
  sessionId,
  dayLevel,
  completedModes,
}: {
  sessionId: string;
  dayLevel: DayLevel;
  completedModes: GameMode[];
}): React.ReactNode {
  const t = useTranslations("DaySelection");
  const gameT = useTranslations("Gameplay");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const modeLabels: Record<GameMode, string> = {
    DRAG_DROP: gameT("dragDrop"),
    PUZZLE: gameT("puzzle"),
    SWAP: gameT("swap"),
    CUE: gameT("cue"),
    FILL: gameT("fill"),
  };
  const dayName = t(
    dayLevel.toLowerCase() as "glimmer" | "glow" | "radiance",
  );
  const availableModes = GAME_MODE_ORDER.filter((mode) =>
    completedModes.includes(mode),
  );

  /** Navigates with the requested mode; the server independently rechecks it. */
  function openPractice(mode: GameMode): void {
    startTransition(() => {
      router.push(`/game/sessions/${sessionId}?practice=${mode}`);
    });
  }

  if (availableModes.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        className={cn(
          buttonVariants({
            variant: "default",
            size: "lg",
            className: "min-h-12 w-full rounded-xl px-4",
          }),
        )}
      >
        {isPending ? (
          <LoaderCircleIcon className="size-5 animate-spin" aria-hidden="true" />
        ) : (
          <RotateCcwIcon className="size-5" aria-hidden="true" />
        )}
        {isPending ? t("openingPractice") : t("practiceMode")}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-xl p-2">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5 font-bold text-foreground">
            {t("choosePracticeMode", { day: dayName })}
          </DropdownMenuLabel>
          {availableModes.map((mode) => (
            <DropdownMenuItem
              key={mode}
              disabled={isPending}
              className="min-h-11 cursor-pointer gap-3 rounded-lg px-3 py-2 font-bold"
              onClick={() => openPractice(mode)}
            >
              <span className="grid size-6 place-items-center rounded-md bg-success-subtle text-xs font-bold text-success-text dark:text-success-text">
                {GAME_MODE_ORDER.indexOf(mode) + 1}
              </span>
              {modeLabels[mode]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
