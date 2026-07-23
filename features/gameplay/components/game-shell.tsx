"use client";

import { useState, useTransition } from "react";
import {
  Clock3Icon,
  LightbulbIcon,
  PlayIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CountdownTimer } from "@/components/shared/countdown-timer";
import { JourneyStageBadge } from "@/components/shared/journey-stage-badge";
import { showActionError } from "@/lib/errors/show-action-error";
import { GAME_MODE_ORDER } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { startGameModeAction } from "@/features/gameplay/actions/start-game-mode.action";
import type {
  GameModeAttemptData,
  GameplaySessionData,
} from "@/features/gameplay/types/game-session.types";

const GAME_MODE_LABELS = {
  DRAG_DROP: "Drag & Drop",
  PUZZLE: "Puzzle",
  SWAP: "Swap",
  CUE: "Cue",
  FILL: "Fill",
} as const;

/**
 * Shared mobile-first frame used by every gameplay mode.
 *
 * Phase 13 owns progress, timer presentation, audio preference, and the hint
 * placeholder. Mode interaction surfaces plug into the central panel later.
 */
export function GameShell({
  gameSession,
}: {
  gameSession: GameplaySessionData;
}): React.ReactNode {
  const [attempt, setAttempt] = useState<GameModeAttemptData | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(gameSession.audioEnabled);
  const [isPending, startTransition] = useTransition();
  const currentMode = gameSession.currentMode;
  const currentModeIndex = currentMode
    ? GAME_MODE_ORDER.indexOf(currentMode)
    : GAME_MODE_ORDER.length;
  const hintsAllowed =
    gameSession.waypoint?.journeyStage === "LEARN" ||
    gameSession.waypoint?.journeyStage === "RECALL";

  const beginMode = (): void => {
    if (!currentMode) return;
    startTransition(async () => {
      const result = await startGameModeAction({
        sessionId: gameSession.id,
        gameMode: currentMode,
      });
      if (!result.success) {
        showActionError(result);
        return;
      }
      if (result.data) setAttempt(result.data);
      toast.success(result.message, { duration: 4_000 });
    });
  };

  const toggleAudio = (): void => {
    const nextEnabled = !audioEnabled;
    setAudioEnabled(nextEnabled);
    document.documentElement.dataset.audioEnabled = String(nextEnabled);
    toast.info(
      nextEnabled
        ? "Audio feedback enabled for this session."
        : "Audio feedback muted for this session.",
      { duration: 4_000 },
    );
  };

  return (
    <main className="min-h-svh bg-linear-to-b from-violet-950 via-slate-950 to-slate-900 px-4 py-5 text-white sm:px-6 sm:py-8">
      <section className="mx-auto flex min-h-[calc(100svh-2.5rem)] max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/90 shadow-2xl shadow-black/40 sm:min-h-[calc(100svh-4rem)]">
        <header className="border-b border-white/10 px-5 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-amber-300 uppercase">
                {gameSession.dayLevel} · Waypoint {gameSession.waypoint?.number}
              </p>
              <h1 className="mt-1 font-heading text-2xl font-black sm:text-3xl">
                {gameSession.verse.reference}
              </h1>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="min-h-11 min-w-11 rounded-xl text-white hover:bg-white/10 hover:text-white"
              aria-label={audioEnabled ? "Mute audio feedback" : "Enable audio feedback"}
              onClick={toggleAudio}
            >
              {audioEnabled ? <Volume2Icon aria-hidden="true" /> : <VolumeXIcon aria-hidden="true" />}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {gameSession.waypoint && (
              <JourneyStageBadge stage={gameSession.waypoint.journeyStage} />
            )}
            <p className="text-sm font-bold text-slate-300">
              Mode {Math.min(currentModeIndex + 1, GAME_MODE_ORDER.length)} of {GAME_MODE_ORDER.length}
            </p>
          </div>

          <ol className="mt-4 grid grid-cols-5 gap-1.5" aria-label="Game mode progress">
            {GAME_MODE_ORDER.map((mode, index) => (
              <li
                key={mode}
                className={cn(
                  "h-2 rounded-full bg-white/10",
                  index < currentModeIndex && "bg-emerald-400",
                  index === currentModeIndex && "bg-amber-400",
                )}
                aria-label={`${GAME_MODE_LABELS[mode]}: ${
                  index < currentModeIndex
                    ? "complete"
                    : index === currentModeIndex
                      ? "current"
                      : "upcoming"
                }`}
              />
            ))}
          </ol>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 text-center sm:px-10">
          <span className="grid size-16 place-items-center rounded-2xl bg-violet-500/20 text-violet-200">
            <PlayIcon className="size-8" aria-hidden="true" />
          </span>
          <p className="mt-5 text-xs font-black tracking-[0.16em] text-violet-300 uppercase">
            Current mode
          </p>
          <h2 className="mt-2 font-heading text-3xl font-black">
            {currentMode ? GAME_MODE_LABELS[currentMode] : "Day complete"}
          </h2>

          {attempt?.expiresAt && (
            <div className="mt-5 flex flex-col items-center gap-2">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-amber-200">
                <Clock3Icon className="size-4" aria-hidden="true" />
                Attempt time remaining
              </span>
              <CountdownTimer
                targetDate={attempt.expiresAt}
                label="Attempt time remaining"
                onExpire={() => {
                  setAttempt(null);
                  toast.error("Time expired. Start a fresh attempt.", { duration: Infinity });
                }}
              />
            </div>
          )}

          <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">
            {attempt
              ? "Your server-authorized attempt is active. The interactive mode surface is introduced in the next gameplay phase."
              : "Begin when ready. Completed earlier modes remain saved if a timed attempt expires."}
          </p>

          {currentMode && !attempt && (
            <Button
              type="button"
              size="lg"
              className="mt-7 min-h-12 rounded-xl bg-amber-400 px-7 font-black text-slate-950 hover:bg-amber-300"
              disabled={isPending}
              onClick={beginMode}
            >
              <PlayIcon data-icon="inline-start" aria-hidden="true" />
              {isPending ? "Starting…" : `Begin ${GAME_MODE_LABELS[currentMode]}`}
            </Button>
          )}
        </div>

        <footer className="border-t border-white/10 px-5 py-4 sm:px-8">
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 w-full justify-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white"
            disabled
            title={
              hintsAllowed
                ? "Hint System arrives in Phase 18."
                : "Hints are unavailable at this Journey Stage."
            }
          >
            <LightbulbIcon data-icon="inline-start" aria-hidden="true" />
            {hintsAllowed ? "Hints arrive in Phase 18" : "Hints unavailable at this stage"}
          </Button>
        </footer>
      </section>
    </main>
  );
}
