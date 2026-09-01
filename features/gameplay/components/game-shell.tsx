"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Clock3Icon,
  EllipsisVerticalIcon,
  LightbulbIcon,
  LogOutIcon,
  PlayIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CountdownTimer } from "@/components/shared/countdown-timer";
import { JourneyStageBadge } from "@/components/shared/journey-stage-badge";
import { LunaMascot } from "@/components/shared/luna-mascot";
import { showActionError } from "@/lib/errors/show-action-error";
import { GAME_MODE_ORDER, JOURNEY_STAGE_MODE_TIME_LIMIT_SECONDS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { startGameModeAction } from "@/features/gameplay/actions/start-game-mode.action";
import { CueMode } from "@/features/gameplay/components/modes/cue-mode";
import { DragDropMode } from "@/features/gameplay/components/modes/drag-drop-mode";
import { FillMode } from "@/features/gameplay/components/modes/fill-mode";
import { PuzzleMode } from "@/features/gameplay/components/modes/puzzle-mode";
import { SwapMode } from "@/features/gameplay/components/modes/swap-mode";
import { TimedAttemptExpired } from "@/features/gameplay/components/timed-attempt-expired";
import type {
  GameModeAttemptData,
  GameplaySessionData,
} from "@/features/gameplay/types/game-session.types";
import type { GameMode } from "@/lib/generated/prisma/enums";
import { HintButton } from "@/features/hints/components/hint-button";
import { verifyLearnHintAccountingAction } from "@/features/hints/actions/verify-learn-hint-accounting.action";
import { verifyStageHintBlockAction } from "@/features/hints/actions/verify-stage-hint-block.action";

/**
 * Shared mobile-first frame used by every gameplay mode.
 *
 * Phase 13 owns progress, timer presentation, audio preference, and the hint
 * placeholder. Mode interaction surfaces plug into the central panel later.
 */
export function GameShell({
  gameSession,
  isAdmin,
}: {
  gameSession: GameplaySessionData;
  isAdmin: boolean;
}): React.ReactNode {
  const t = useTranslations("Gameplay");
  const dayT = useTranslations("DaySelection");
  const router = useRouter();
  const modeLabels: Record<GameMode, string> = {
    DRAG_DROP: t("dragDrop"),
    PUZZLE: t("puzzle"),
    SWAP: t("swap"),
    CUE: t("cue"),
    FILL: t("fill"),
  };
  const dayLabel = gameSession.dayLevel
    ? dayT(gameSession.dayLevel.toLowerCase() as "glimmer" | "glow" | "radiance")
    : "";
  const [attempt, setAttempt] = useState<GameModeAttemptData | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(gameSession.audioEnabled);
  const [testReplayMode, setTestReplayMode] = useState<GameMode | null>(null);
  const [currentMode, setCurrentMode] = useState<GameMode | null>(
    gameSession.currentMode,
  );
  const [expiredMode, setExpiredMode] = useState<GameMode | null>(null);
  const [isAwaitingContinue, setIsAwaitingContinue] = useState(false);
  const [isPending, startTransition] = useTransition();
  const currentModeIndex = currentMode
    ? GAME_MODE_ORDER.indexOf(currentMode)
    : GAME_MODE_ORDER.length;
  const hintsAllowed =
    gameSession.waypoint?.journeyStage === "LEARN" ||
    gameSession.waypoint?.journeyStage === "RECALL";
  const canVerifyLearnHint =
    isAdmin &&
    !gameSession.isAdminTest &&
    !gameSession.isVaultReplay &&
    gameSession.waypoint?.journeyStage === "LEARN" &&
    Boolean(currentMode);
  const canVerifyBlockedHint =
    isAdmin &&
    gameSession.isAdminTest &&
    (gameSession.waypoint?.journeyStage === "STRENGTHEN" ||
      gameSession.waypoint?.journeyStage === "MASTER");
  // The Vault QA fixture carries both flags: `isAdminTest` prevents rewards,
  // while `isVaultReplay` means it still follows the full five-mode sequence.
  // Only the older waypoint probe is genuinely a single-mode administrator test.
  const isSingleModeAdminTest =
    gameSession.isAdminTest && !gameSession.isVaultReplay;
  const completedReplayModes = GAME_MODE_ORDER.filter((mode) =>
    gameSession.completedModes.includes(mode),
  );
  const modeTimeLimitSeconds = gameSession.waypoint
    ? JOURNEY_STAGE_MODE_TIME_LIMIT_SECONDS[gameSession.waypoint.journeyStage]
    : null;
  const modeTimeLimitMinutes = modeTimeLimitSeconds
    ? Math.ceil(modeTimeLimitSeconds / 60)
    : null;
  const beaconLevelRange =
    gameSession.beaconProgress.nextLevelXp -
    gameSession.beaconProgress.currentLevelStartXp;
  const beaconLevelProgress = Math.min(
    100,
    Math.max(
      0,
      ((gameSession.beaconProgress.lifetimeXp -
        gameSession.beaconProgress.currentLevelStartXp) /
        beaconLevelRange) *
        100,
    ),
  );

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
      if (result.data) {
        setAttempt(result.data);
        setExpiredMode(null);
      }
      toast.success(result.message, { duration: 4_000 });
    });
  };

  const toggleAudio = (): void => {
    const nextEnabled = !audioEnabled;
    setAudioEnabled(nextEnabled);
    document.documentElement.dataset.audioEnabled = String(nextEnabled);
    toast.info(
      nextEnabled
        ? t("audioOn")
        : t("audioOff"),
      { duration: 4_000 },
    );
  };

  /** Confirms one real Learn hint and its aggregate usage counter agree. */
  const verifyLearnHintAccounting = (): void => {
    startTransition(async () => {
      const result = await verifyLearnHintAccountingAction({
        sessionId: gameSession.id,
      });
      if (!result.success) {
        showActionError(result);
        return;
      }
      toast.success(result.message, { duration: 4_000 });
    });
  };

  /** Exercises the real server gate for an isolated Strengthen/Master test. */
  const verifyBlockedHint = (): void => {
    startTransition(async () => {
      const result = await verifyStageHintBlockAction({
        sessionId: gameSession.id,
      });
      if (!result.success) {
        showActionError(result);
        return;
      }
      toast.success(result.message, { duration: 4_000 });
    });
  };

  /**
   * Advances the visible mode only after the learner activates Continue.
   *
   * Server Actions can stream refreshed session props in their response. Local
   * mode state intentionally holds the completed surface in place until this
   * explicit transition, so the completion dialog cannot dismiss itself.
   */
  const continueToMode = (nextMode: GameMode | null): void => {
    setAttempt(null);
    setExpiredMode(null);
    setCurrentMode(nextMode);
    setIsAwaitingContinue(false);
    if (!nextMode && gameSession.isVaultReplay) {
      router.push("/vault");
      return;
    }
    // A Vault QA fixture is also marked as an admin test to suppress every
    // progression side effect. It must nevertheless remain in this session
    // between modes; only the older single-mode waypoint probe returns here.
    if (gameSession.isAdminTest && !gameSession.isVaultReplay) {
      router.push("/admin/waypoints");
      return;
    }
    if (!nextMode && gameSession.waypointId) {
      router.push(`/game/waypoints/${gameSession.waypointId}`);
      return;
    }
    router.refresh();
  };

  /** Leaves the Radiance milestone for the completed verse's private Sanctuary. */
  const continueToSanctuary = (): void => {
    setAttempt(null);
    setExpiredMode(null);
    setIsAwaitingContinue(false);
    router.push(`/sanctuary/${gameSession.verse.id}`);
  };

  /** Restores the live attempt after a client-only administrator replay. */
  const exitTestReplay = (): void => {
    setTestReplayMode(null);
    setIsAwaitingContinue(false);
  };

  return (
    <main className="min-h-svh bg-linear-to-b from-violet-100/80 via-background to-amber-50 px-4 py-5 text-foreground dark:from-violet-950 dark:via-slate-950 dark:to-slate-900 sm:px-6 sm:py-8">
      <section className="mx-auto flex min-h-[calc(100svh-2.5rem)] max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-border bg-card/95 shadow-2xl shadow-foreground/15 dark:border-white/10 dark:bg-slate-900/90 dark:shadow-black/40 sm:min-h-[calc(100svh-4rem)]">
        <header className="border-b border-border px-5 py-5 dark:border-white/10 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="whitespace-nowrap text-xs font-black tracking-[0.12em] text-amber-700 uppercase dark:text-amber-300 sm:tracking-[0.16em]">
                {gameSession.isAdminTest
                  ? t("adminTesting")
                  : gameSession.isVaultReplay
                  ? t("vaultReplay")
                  : t("dayWaypoint", { day: dayLabel, number: gameSession.waypoint?.number ?? 0 })}
              </p>
              <h1 className="mt-1 font-heading text-2xl font-black sm:text-3xl">
                {gameSession.verse.reference}
              </h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground shadow-sm transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                aria-label={t("openMenu")}
              >
                <EllipsisVerticalIcon className="size-5" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 rounded-xl border border-border p-2 dark:border-white/10"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="px-2 py-1.5 font-black text-foreground">
                    {t("gameMenu")}
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    className="min-h-11 cursor-pointer gap-3 rounded-lg px-3 py-2 font-bold"
                    onClick={toggleAudio}
                  >
                    {audioEnabled ? (
                      <Volume2Icon aria-hidden="true" />
                    ) : (
                      <VolumeXIcon aria-hidden="true" />
                    )}
                    {t("sound")}
                    <DropdownMenuShortcut>
                      {audioEnabled ? t("on") : t("off")}
                    </DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                {(canVerifyLearnHint || canVerifyBlockedHint) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="px-2 py-1.5 font-black text-foreground">
                        {t("adminTesting")}
                      </DropdownMenuLabel>
                      {canVerifyLearnHint && (
                        <DropdownMenuItem
                          className="min-h-11 cursor-pointer gap-3 rounded-lg px-3 py-2 font-bold"
                          onClick={verifyLearnHintAccounting}
                        >
                          <LightbulbIcon aria-hidden="true" />
                          {t("verifyHintAccounting")}
                        </DropdownMenuItem>
                      )}
                      {canVerifyBlockedHint && (
                        <DropdownMenuItem
                          className="min-h-11 cursor-pointer gap-3 rounded-lg px-3 py-2 font-bold"
                          onClick={verifyBlockedHint}
                        >
                          <ShieldCheckIcon aria-hidden="true" />
                          {t("verifyBlockedHint")}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                  </>
                )}
                {isAdmin &&
                  !gameSession.isAdminTest &&
                  gameSession.completedModes.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuLabel className="px-2 py-1.5 font-black text-foreground">
                          {t("adminTesting")}
                        </DropdownMenuLabel>
                        {testReplayMode ? (
                          <DropdownMenuItem
                            className="min-h-11 cursor-pointer gap-3 rounded-lg px-3 py-2 font-bold"
                            onClick={exitTestReplay}
                          >
                            <RotateCcwIcon aria-hidden="true" />
                            {t("returnCurrent")}
                          </DropdownMenuItem>
                        ) : (
                          completedReplayModes.map((mode) => (
                            <DropdownMenuItem
                              key={mode}
                              className="min-h-11 cursor-pointer gap-3 rounded-lg px-3 py-2 font-bold"
                              onClick={() => setTestReplayMode(mode)}
                            >
                              <span className="grid size-6 place-items-center rounded-md bg-sky-500/15 text-xs font-black text-sky-700 dark:text-sky-200">
                                {GAME_MODE_ORDER.indexOf(mode) + 1}
                              </span>
                              {t("replayMode", { mode: modeLabels[mode] })}
                            </DropdownMenuItem>
                          ))
                        )}
                      </DropdownMenuGroup>
                    </>
                  )}
                {(gameSession.waypointId || gameSession.isVaultReplay) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      className="min-h-11 cursor-pointer gap-3 rounded-lg px-3 py-2 font-bold"
                      onClick={() =>
                        router.push(
                          gameSession.isAdminTest
                            ? "/admin/waypoints"
                            : gameSession.isVaultReplay
                            ? "/vault"
                            : `/game/waypoints/${gameSession.waypointId}`,
                        )
                      }
                    >
                      <LogOutIcon aria-hidden="true" />
                      {t("exitGameplay")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {gameSession.waypoint && (
              <JourneyStageBadge stage={gameSession.waypoint.journeyStage} />
            )}
            <p className="text-sm font-bold text-muted-foreground">
              {t("modeProgress", { current: Math.min(currentModeIndex + 1, GAME_MODE_ORDER.length), total: GAME_MODE_ORDER.length })}
            </p>
          </div>

          <ol className="mt-4 grid grid-cols-5 gap-1.5" aria-label={t("progress")}>
            {GAME_MODE_ORDER.map((mode, index) => (
              <li
                key={mode}
                className={cn(
                  "h-2 rounded-full bg-muted",
                  index < currentModeIndex && "bg-emerald-400",
                  index === currentModeIndex && "bg-amber-400",
                )}
                aria-label={`${modeLabels[mode]}: ${
                  index < currentModeIndex
                    ? t("completeState")
                    : index === currentModeIndex
                      ? t("currentState")
                      : t("upcomingState")
                }`}
              />
            ))}
          </ol>

          <div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-500/8 p-3">
            <div className="flex items-center justify-between gap-3 text-xs font-black">
              <span>{t("beaconLevel", { level: gameSession.beaconProgress.level })}</span>
              <span className="text-violet-700 dark:text-violet-300">
                {t("beaconXp", { count: gameSession.beaconProgress.lifetimeXp })}
              </span>
            </div>
            <div
              className="mt-2 h-2.5 overflow-hidden rounded-full bg-violet-950/15 dark:bg-black/35"
              role="progressbar"
              aria-label={t("beaconProgress")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(beaconLevelProgress)}
            >
              <div
                className="h-full rounded-full bg-linear-to-r from-violet-500 to-fuchsia-400"
                style={{ width: `${beaconLevelProgress}%` }}
              />
            </div>
          </div>

          {gameSession.isAdminTest && (
            <div className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-sky-400/25 bg-sky-100/70 px-3 py-2 text-xs font-bold text-sky-800 dark:border-sky-300/20 dark:bg-sky-300/8 dark:text-sky-200">
              <ShieldCheckIcon className="size-4 shrink-0" aria-hidden="true" />
              {t("adminTesting")}
            </div>
          )}

        </header>

        <div className="flex flex-1 flex-col items-center px-5 py-8 text-center sm:px-10">
          {attempt?.expiresAt && !isAwaitingContinue && !testReplayMode && (
            <div className="mb-6 flex flex-col items-center gap-2">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-200">
                <Clock3Icon className="size-4" aria-hidden="true" />
                {t("timeRemaining")}
              </span>
              <CountdownTimer
                targetDate={attempt.expiresAt}
                label={t("timeRemaining")}
                onExpire={() => {
                  setAttempt(null);
                  setExpiredMode(currentMode);
                }}
              />
            </div>
          )}

          {testReplayMode === "DRAG_DROP" && gameSession.dayLevel ? (
            <DragDropMode
              sessionId={gameSession.id}
              dayLevel={gameSession.dayLevel}
              verseText={gameSession.verse.translationText}
              attempt={null}
              isTestReplay
              nextMode={currentMode}
              onContinue={exitTestReplay}
              onCompletionShown={() => setIsAwaitingContinue(true)}
              onTestReplayExit={exitTestReplay}
            />
          ) : testReplayMode === "PUZZLE" && gameSession.dayLevel ? (
            <PuzzleMode
              sessionId={gameSession.id}
              dayLevel={gameSession.dayLevel}
              verseText={gameSession.verse.translationText}
              attempt={null}
              isTestReplay
              nextMode={currentMode}
              onContinue={exitTestReplay}
              onCompletionShown={() => setIsAwaitingContinue(true)}
              onTestReplayExit={exitTestReplay}
            />
          ) : testReplayMode === "SWAP" && gameSession.dayLevel ? (
            <SwapMode
              sessionId={gameSession.id}
              dayLevel={gameSession.dayLevel}
              verseText={gameSession.verse.translationText}
              attempt={null}
              isTestReplay
              nextMode={currentMode}
              onContinue={exitTestReplay}
              onCompletionShown={() => setIsAwaitingContinue(true)}
              onTestReplayExit={exitTestReplay}
            />
          ) : testReplayMode === "CUE" && gameSession.dayLevel ? (
            <CueMode
              sessionId={gameSession.id}
              dayLevel={gameSession.dayLevel}
              verseText={gameSession.verse.translationText}
              attempt={null}
              isTestReplay
              nextMode={currentMode}
              onContinue={exitTestReplay}
              onCompletionShown={() => setIsAwaitingContinue(true)}
              onTestReplayExit={exitTestReplay}
            />
          ) : testReplayMode === "FILL" && gameSession.dayLevel ? (
            <FillMode
              sessionId={gameSession.id}
              dayLevel={gameSession.dayLevel}
              waypointNumber={gameSession.waypoint?.number ?? 0}
              verseReference={gameSession.verse.reference}
              verseText={gameSession.verse.translationText}
              attempt={null}
              isTestReplay
              nextMode={currentMode}
              onContinue={exitTestReplay}
              onWaypointContinue={continueToSanctuary}
              onCompletionShown={() => setIsAwaitingContinue(true)}
              onTestReplayExit={exitTestReplay}
            />
          ) : currentMode === "DRAG_DROP" && attempt && gameSession.dayLevel ? (
            <DragDropMode
              sessionId={gameSession.id}
              dayLevel={gameSession.dayLevel}
              verseText={gameSession.verse.translationText}
              attempt={attempt}
              isVaultReplay={gameSession.isVaultReplay}
              isAdminTest={gameSession.isAdminTest}
              nextMode={
                isSingleModeAdminTest
                  ? null
                  : GAME_MODE_ORDER[currentModeIndex + 1] ?? null
              }
              onContinue={() =>
                continueToMode(GAME_MODE_ORDER[currentModeIndex + 1] ?? null)
              }
              onCompletionShown={() => setIsAwaitingContinue(true)}
            />
          ) : currentMode === "PUZZLE" && attempt && gameSession.dayLevel ? (
            <PuzzleMode
              sessionId={gameSession.id}
              dayLevel={gameSession.dayLevel}
              verseText={gameSession.verse.translationText}
              attempt={attempt}
              isVaultReplay={gameSession.isVaultReplay}
              isAdminTest={gameSession.isAdminTest}
              nextMode={
                isSingleModeAdminTest
                  ? null
                  : GAME_MODE_ORDER[currentModeIndex + 1] ?? null
              }
              onContinue={() =>
                continueToMode(GAME_MODE_ORDER[currentModeIndex + 1] ?? null)
              }
              onCompletionShown={() => setIsAwaitingContinue(true)}
            />
          ) : currentMode === "SWAP" && attempt && gameSession.dayLevel ? (
            <SwapMode
              sessionId={gameSession.id}
              dayLevel={gameSession.dayLevel}
              verseText={gameSession.verse.translationText}
              attempt={attempt}
              isVaultReplay={gameSession.isVaultReplay}
              isAdminTest={gameSession.isAdminTest}
              nextMode={
                isSingleModeAdminTest
                  ? null
                  : GAME_MODE_ORDER[currentModeIndex + 1] ?? null
              }
              onContinue={() =>
                continueToMode(GAME_MODE_ORDER[currentModeIndex + 1] ?? null)
              }
              onCompletionShown={() => setIsAwaitingContinue(true)}
            />
          ) : currentMode === "CUE" && attempt && gameSession.dayLevel ? (
            <CueMode
              sessionId={gameSession.id}
              dayLevel={gameSession.dayLevel}
              verseText={gameSession.verse.translationText}
              attempt={attempt}
              isVaultReplay={gameSession.isVaultReplay}
              isAdminTest={gameSession.isAdminTest}
              nextMode={
                isSingleModeAdminTest
                  ? null
                  : GAME_MODE_ORDER[currentModeIndex + 1] ?? null
              }
              onContinue={() =>
                continueToMode(GAME_MODE_ORDER[currentModeIndex + 1] ?? null)
              }
              onCompletionShown={() => setIsAwaitingContinue(true)}
            />
          ) : currentMode === "FILL" && attempt && gameSession.dayLevel ? (
            <FillMode
              sessionId={gameSession.id}
              dayLevel={gameSession.dayLevel}
              waypointNumber={gameSession.waypoint?.number ?? 0}
              verseReference={gameSession.verse.reference}
              verseText={gameSession.verse.translationText}
              attempt={attempt}
              isVaultReplay={gameSession.isVaultReplay}
              isAdminTest={gameSession.isAdminTest}
              nextMode={null}
              onContinue={() => continueToMode(null)}
              onWaypointContinue={continueToSanctuary}
              onCompletionShown={() => setIsAwaitingContinue(true)}
            />
          ) : expiredMode && currentMode === expiredMode ? (
            <TimedAttemptExpired
              modeLabel={modeLabels[expiredMode]}
              isPending={isPending}
              onRetry={beginMode}
            />
          ) : (
            <div className="my-auto flex w-full max-w-xl items-end gap-2 overflow-hidden rounded-[2rem] border border-violet-300/45 bg-linear-to-br from-card via-card to-violet-100/80 p-6 dark:to-violet-950/40 sm:gap-5 sm:p-8">
              <div className="relative z-10 flex min-h-72 min-w-0 flex-1 flex-col items-start">
              <p className="mt-5 text-xs font-black tracking-[0.16em] text-violet-700 uppercase dark:text-violet-300">
                {t("upNext")}
              </p>
              <h2 className="mt-2 font-heading text-3xl font-black">
                {currentMode ? modeLabels[currentMode] : t("dayComplete")}
              </h2>
              {!attempt && currentMode && (
                <div className="mt-5 rounded-2xl border border-violet-300/40 bg-background/75 p-4">
                  {modeTimeLimitMinutes ? (
                    <>
                      <p className="inline-flex items-center gap-2 font-black"><Clock3Icon className="size-5 text-violet-600" aria-hidden="true" />{t("minuteChallenge", { minutes: modeTimeLimitMinutes })}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{t("clockStarts")}</p>
                    </>
                  ) : (
                    <>
                      <p className="inline-flex items-center gap-2 font-black"><SparklesIcon className="size-5 text-amber-500" aria-hidden="true" />{t("learnPace")}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{t("noTimer")}</p>
                    </>
                  )}
                </div>
              )}

              {currentMode && !attempt && (
                <Button
                  type="button"
                  size="lg"
                  className="mt-auto min-h-12 rounded-xl bg-amber-400 px-7 font-black text-slate-950 hover:bg-amber-300"
                  disabled={isPending}
                  onClick={beginMode}
                >
                  <PlayIcon data-icon="inline-start" aria-hidden="true" />
                  {isPending ? t("starting") : t("beginMode", { mode: modeLabels[currentMode] })}
                </Button>
              )}
              </div>
              <LunaMascot pose={modeTimeLimitMinutes ? "encourage" : "guide"} decorative className="-mr-12 w-32 shrink-0 sm:-mr-9 sm:w-44" sizes="176px" />
            </div>
          )}
        </div>

        {hintsAllowed && (currentMode || testReplayMode) && (
          <footer className="border-t border-border px-5 py-4 dark:border-white/10 sm:px-8">
            <HintButton
              sessionId={gameSession.id}
              initialBalance={gameSession.hintBalance}
              disabled={isAwaitingContinue}
              isTestReplay={Boolean(testReplayMode)}
              isAdminTest={gameSession.isAdminTest}
              testReference={gameSession.verse.reference}
              testVerseText={gameSession.verse.translationText}
            />
          </footer>
        )}
      </section>
    </main>
  );
}
