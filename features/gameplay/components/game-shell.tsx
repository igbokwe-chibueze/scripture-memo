"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import activeStyles from "./active-game.module.css";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Clock3Icon,
  EllipsisVerticalIcon,
  LightbulbIcon,
  LogOutIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
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
  LocalReplayKind,
} from "@/features/gameplay/types/game-session.types";
import type { GameMode } from "@/lib/generated/prisma/enums";
import type { ActionResult } from "@/types/api";
import { HintButton } from "@/features/hints";
import { ModeIntroduction } from "./mode-introduction";
import { SessionBeaconProgress } from "./session-beacon-progress";
import styles from "./session-introduction.module.css";
import { verifyLearnHintAccountingAction } from "@/features/hints/actions/verify-learn-hint-accounting.action";
import { verifyStageHintBlockAction } from "@/features/hints/actions/verify-stage-hint-block.action";

/**
 * Shared mobile-first frame used by every gameplay mode.
 *
 * Preparation retains its progression header; active boards use the approved
 * compact mascot header. Completion surfaces remain owned by their existing
 * components. Artwork never starts attempts, changes deadlines, or awards XP.
 */
export function GameShell({
  gameSession,
  isAdmin,
  playerPracticeMode = null,
  startModeAction = startGameModeAction,
  useSampleHint = false,
}: {
  gameSession: GameplaySessionData;
  isAdmin: boolean;
  playerPracticeMode?: GameMode | null;
  startModeAction?: (input: {
    sessionId: string;
    gameMode: GameMode;
  }) => Promise<ActionResult<GameModeAttemptData>>;
  useSampleHint?: boolean;
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
  const [adminTestReplayMode, setAdminTestReplayMode] =
    useState<GameMode | null>(null);
  const replayMode = playerPracticeMode ?? adminTestReplayMode;
  const replayKind: LocalReplayKind | undefined = playerPracticeMode
    ? "PLAYER_PRACTICE"
    : adminTestReplayMode || useSampleHint
      ? "ADMIN_TEST"
      : undefined;
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
    !playerPracticeMode &&
    !gameSession.isAdminTest &&
    !gameSession.isVaultReplay &&
    gameSession.waypoint?.journeyStage === "LEARN" &&
    Boolean(currentMode);
  const canVerifyBlockedHint =
    isAdmin &&
    !playerPracticeMode &&
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
  const isIntroduction = Boolean(
    currentMode && !attempt && !replayMode && currentMode !== expiredMode,
  );
  // Only live boards use the compact mascot header. Preparation, expiry, and
  // completion retain their separate compositions and existing progression UI.
  const isActiveBoard = Boolean((attempt || replayMode) && !isAwaitingContinue);

  const beginMode = (): void => {
    if (!currentMode) return;
    startTransition(async () => {
      try {
        const result = await startModeAction({
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
      } catch {
        // Keep the preparation/retry state usable after a transport failure.
        toast.error(t("introStartFailed"), { duration: Infinity });
      }
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
  const exitLocalReplay = (): void => {
    if (playerPracticeMode && gameSession.waypointId) {
      router.push(`/game/waypoints/${gameSession.waypointId}`);
      return;
    }

    setAdminTestReplayMode(null);
    setIsAwaitingContinue(false);
  };

  return (
    <main
      className={cn(
        "min-h-svh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8",
        isIntroduction && styles.introPage,
        isActiveBoard && activeStyles.activePage,
      )}
    >
      <section
        className={cn(
          "mx-auto flex min-h-[calc(100svh-2.5rem)] max-w-3xl flex-col",
          "overflow-hidden rounded-[2rem] border border-border bg-card/95",
          "shadow-[0_18px_44px_color-mix(in_oklch,var(--foreground)_12%,transparent)]",
          "sm:min-h-[calc(100svh-4rem)]",
          isIntroduction && styles.introFrame,
          isActiveBoard && activeStyles.activeFrame,
        )}
      >
        <header
          className={cn(
            "border-b border-border px-5 py-5 dark:border-border/10 sm:px-8",
            styles.header,
            isActiveBoard && activeStyles.activeHeader,
          )}
        >
          {isActiveBoard && (
            <div className={activeStyles.mascotScene}>
              <Image
                src="/images/mascot/meemo/meemo-gameplay-header.png"
                alt=""
                aria-hidden="true"
                width={1254}
                height={1254}
                sizes="160px"
              />
            </div>
          )}
          <div
            className={cn(
              styles.headingRow,
              isActiveBoard && activeStyles.activeHeading,
            )}
          >
            <div className={styles.headingCopy}>
              {!isActiveBoard && (
                <p className={styles.eyebrow}>
                  {playerPracticeMode
                    ? t("playerPractice")
                    : gameSession.isAdminTest
                      ? t("adminTesting")
                      : gameSession.isVaultReplay
                        ? t("vaultReplay")
                        : t("dayWaypoint", {
                            day: dayLabel,
                            number: gameSession.waypoint?.number ?? 0,
                          })}
                </p>
              )}
              <h1
                className={isActiveBoard ? activeStyles.activeTitle : styles.verseTitle}
              >
                {gameSession.verse.reference}
              </h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                data-slot="button"
                className={buttonVariants({
                  variant: "outline",
                  size: "icon",
                  className: cn(
                    styles.menuButton,
                    isActiveBoard && activeStyles.activeMenu,
                  ),
                })}
                aria-label={t("openMenu")}
              >
                <EllipsisVerticalIcon className="size-5" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 rounded-xl border border-border p-2 dark:border-border/10"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="px-2 py-1.5 font-bold text-foreground">
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
                      <DropdownMenuLabel className="px-2 py-1.5 font-bold text-foreground">
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
                  !playerPracticeMode &&
                  !gameSession.isAdminTest &&
                  gameSession.completedModes.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuLabel className="px-2 py-1.5 font-bold text-foreground">
                          {t("adminTesting")}
                        </DropdownMenuLabel>
                        {adminTestReplayMode ? (
                          <DropdownMenuItem
                            className="min-h-11 cursor-pointer gap-3 rounded-lg px-3 py-2 font-bold"
                            onClick={exitLocalReplay}
                          >
                            <RotateCcwIcon aria-hidden="true" />
                            {t("returnCurrent")}
                          </DropdownMenuItem>
                        ) : (
                          completedReplayModes.map((mode) => (
                            <DropdownMenuItem
                              key={mode}
                              className="min-h-11 cursor-pointer gap-3 rounded-lg px-3 py-2 font-bold"
                              onClick={() => setAdminTestReplayMode(mode)}
                            >
                              <span className="grid size-6 place-items-center rounded-md bg-info-subtle text-xs font-bold text-info-text dark:text-info-text">
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
                          playerPracticeMode
                            ? `/game/waypoints/${gameSession.waypointId}`
                            : gameSession.isAdminTest
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

          <div
            className={cn(
              styles.stageRow,
              isActiveBoard && activeStyles.activeStage,
            )}
          >
            {gameSession.waypoint && (
              <JourneyStageBadge stage={gameSession.waypoint.journeyStage} className={styles.stage} />
            )}
            {!playerPracticeMode && !isActiveBoard && (
              <p className={styles.modeCount}>
                {t("modeProgress", {
                  current: Math.min(
                    currentModeIndex + 1,
                    GAME_MODE_ORDER.length,
                  ),
                  total: GAME_MODE_ORDER.length,
                })}
              </p>
            )}
          </div>

          {!playerPracticeMode && !isActiveBoard && (
            <ol
              className={styles.modeSegments}
              aria-label={t("progress")}
            >
              {GAME_MODE_ORDER.map((mode, index) => (
                <li
                  key={mode}
                  className={cn(
                    styles.segment,
                    index < currentModeIndex && styles.segmentComplete,
                    index === currentModeIndex && styles.segmentCurrent,
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
          )}

          {!playerPracticeMode && !isActiveBoard && (
            <SessionBeaconProgress progress={gameSession.beaconProgress} />
          )}

          {(gameSession.isAdminTest || playerPracticeMode) && (
            <div className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-info-border/25 bg-info-subtle px-3 py-2 text-xs font-bold text-info-text dark:border-info-border/20 dark:bg-info-subtle dark:text-info-text">
              <ShieldCheckIcon className="size-4 shrink-0" aria-hidden="true" />
              {playerPracticeMode ? t("playerPracticeBanner") : t("adminTesting")}
            </div>
          )}

        </header>

        <div
          className={isIntroduction
            ? styles.introPanel
            : isActiveBoard
            ? activeStyles.activePanel
            : "flex flex-1 flex-col items-center px-5 py-8 text-center sm:px-10"
          }
        >
          {attempt?.expiresAt &&
            !isAwaitingContinue &&
            !replayMode &&
            !playerPracticeMode && (
            <div className="mb-6 flex flex-col items-center gap-2">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-reward-text dark:text-reward-text">
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

          {replayMode === "DRAG_DROP" && gameSession.dayLevel ? (
            <DragDropMode
              sessionId={gameSession.id}
              dayLevel={gameSession.dayLevel}
              verseText={gameSession.verse.translationText}
              attempt={null}
              replayKind={replayKind}
              nextMode={currentMode}
              onContinue={exitLocalReplay}
              onCompletionShown={() => setIsAwaitingContinue(true)}
              onReplayExit={exitLocalReplay}
            />
          ) : replayMode === "PUZZLE" && gameSession.dayLevel ? (
            <PuzzleMode
              sessionId={gameSession.id}
              dayLevel={gameSession.dayLevel}
              verseText={gameSession.verse.translationText}
              attempt={null}
              replayKind={replayKind}
              nextMode={currentMode}
              onContinue={exitLocalReplay}
              onCompletionShown={() => setIsAwaitingContinue(true)}
              onReplayExit={exitLocalReplay}
            />
          ) : replayMode === "SWAP" && gameSession.dayLevel ? (
            <SwapMode
              sessionId={gameSession.id}
              dayLevel={gameSession.dayLevel}
              verseText={gameSession.verse.translationText}
              attempt={null}
              replayKind={replayKind}
              nextMode={currentMode}
              onContinue={exitLocalReplay}
              onCompletionShown={() => setIsAwaitingContinue(true)}
              onReplayExit={exitLocalReplay}
            />
          ) : replayMode === "CUE" && gameSession.dayLevel ? (
            <CueMode
              sessionId={gameSession.id}
              dayLevel={gameSession.dayLevel}
              verseText={gameSession.verse.translationText}
              attempt={null}
              replayKind={replayKind}
              nextMode={currentMode}
              onContinue={exitLocalReplay}
              onCompletionShown={() => setIsAwaitingContinue(true)}
              onReplayExit={exitLocalReplay}
            />
          ) : replayMode === "FILL" && gameSession.dayLevel ? (
            <FillMode
              sessionId={gameSession.id}
              dayLevel={gameSession.dayLevel}
              waypointNumber={gameSession.waypoint?.number ?? 0}
              verseReference={gameSession.verse.reference}
              verseText={gameSession.verse.translationText}
              attempt={null}
              replayKind={replayKind}
              nextMode={currentMode}
              onContinue={exitLocalReplay}
              onWaypointContinue={continueToSanctuary}
              onCompletionShown={() => setIsAwaitingContinue(true)}
              onReplayExit={exitLocalReplay}
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
          ) : currentMode ? (
            <ModeIntroduction
              mode={currentMode}
              modeLabel={modeLabels[currentMode]}
              minutes={modeTimeLimitMinutes}
              hintsAllowed={hintsAllowed}
              hintBalance={gameSession.hintBalance}
              isTestHint={gameSession.isAdminTest || useSampleHint}
              isPending={isPending}
              onBegin={beginMode}
            />
          ) : (
            <div className="my-auto w-full max-w-xl overflow-hidden rounded-dialog border border-border bg-card p-5 text-left sm:p-8">
              <p className="text-xs font-bold tracking-[0.16em] text-selection-text uppercase dark:text-selection-text">
                {t("upNext")}
              </p>
              <h2 className="mt-2 font-heading text-2xl leading-tight font-bold sm:text-3xl">
                {t("dayComplete")}
              </h2>
              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_6rem] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_10rem] sm:gap-6">
                <LunaMascot
                  pose={modeTimeLimitMinutes ? "encourage" : "guide"}
                  decorative
                  className="-mr-3 w-24 justify-self-end sm:-mr-2 sm:w-40"
                  sizes="160px"
                />
              </div>
            </div>
          )}
        </div>

        {!isIntroduction &&
          !playerPracticeMode &&
          hintsAllowed &&
          (currentMode || adminTestReplayMode) && (
          <footer className={isActiveBoard ? activeStyles.hintFooter : "border-t border-border px-5 py-4 dark:border-border/10 sm:px-8"}>
            <HintButton
              sessionId={gameSession.id}
              initialBalance={gameSession.hintBalance}
              disabled={isAwaitingContinue}
              isTestReplay={Boolean(adminTestReplayMode) || useSampleHint}
              isAdminTest={gameSession.isAdminTest}
              testReference={gameSession.verse.reference}
              testVerseText={gameSession.verse.translationText}
              className={isActiveBoard ? activeStyles.hintButton : undefined}
            />
          </footer>
        )}
      </section>
    </main>
  );
}
