"use client";

import { useMemo, useState, useTransition } from "react";
import { ActiveModeHeading, SwapTileLegend } from "../active-mode-heading";
import styles from "../active-game.module.css";
import { useTranslations } from "next-intl";
import { CheckIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-button";
import { Button } from "@/components/ui/button";
import { BadgeUnlockSequence } from "@/features/badges";
import type { BadgeUnlockResult } from "@/features/badges/types/badge.types";
import type { BeaconProgressionResult } from "@/features/beacon/types/beacon.types";
import { showActionError } from "@/lib/errors/show-action-error";
import { completeGameModeAction } from "@/features/gameplay/actions/complete-game-mode.action";
import { ConfettiCelebration } from "@/components/shared/confetti-celebration";
import { GAMEPLAY_TILE_STATE_STYLES } from "@/features/gameplay/constants/gameplay-state-styles";
import { ModeCompletionScreen } from "@/features/gameplay/components/mode-completion-screen";
import { StreakCompletionScreen } from "@/features/gameplay/components/streak-completion-screen";
import { useAudioFeedback } from "@/hooks/use-audio-feedback";
import { getSessionHiddenPercent } from "@/features/gameplay/lib/hidden-word-generator";
import {
  areSwapTokensCorrect,
  generateSwapTokens,
  getIncorrectSwapPositions,
  reconstructSwapAnswer,
  swapTokenPositions,
  type SwapToken,
} from "@/features/gameplay/lib/swap-generator";
import { tokenizeVerse } from "@/features/gameplay/lib/verse-tokenizer";
import type {
  GameModeAttemptData,
  LocalReplayKind,
  StreakCompletionResult,
} from "@/features/gameplay/types/game-session.types";
import { cn } from "@/lib/utils";
import type { DayLevel } from "@/lib/generated/prisma/enums";

type PositionFeedback = Readonly<Record<number, "correct" | "incorrect">>;

/**
 * Implements the position-based word correction mode for pointer and touch.
 *
 * Occurrence indices keep interactions stable; correctness compares canonical
 * wording so identical repeated tiles are interchangeable. The authenticated
 * completion action remains authoritative over text, timing, and progression.
 */
export function SwapMode({
  sessionId,
  dayLevel,
  verseText,
  attempt,
  replayKind,
  isVaultReplay = false,
  isAdminTest = false,
  nextMode,
  onContinue,
  onCompletionShown,
  onReplayExit,
}: {
  sessionId: string;
  dayLevel: DayLevel;
  verseText: string;
  attempt: GameModeAttemptData | null;
  replayKind?: LocalReplayKind;
  isVaultReplay?: boolean;
  isAdminTest?: boolean;
  nextMode: GameModeAttemptData["gameMode"] | null;
  onContinue: () => void;
  onCompletionShown: () => void;
  onReplayExit?: () => void;
}): React.ReactNode {
  const t = useTranslations("Gameplay");
  const playAudio = useAudioFeedback();
  const seed = `${sessionId}:${dayLevel}:SWAP`;
  const verseTokens = useMemo(() => tokenizeVerse(verseText), [verseText]);
  const initialTokens = useMemo(() => {
    const swappedPercent = getSessionHiddenPercent(dayLevel, seed);
    return generateSwapTokens(verseTokens, swappedPercent, seed);
  }, [dayLevel, seed, verseTokens]);
  const [tokens, setTokens] = useState<SwapToken[]>(initialTokens);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [positionFeedback, setPositionFeedback] = useState<PositionFeedback>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [badgeUnlocks, setBadgeUnlocks] = useState<BadgeUnlockResult[]>([]);
  const [badgeUnlockIndex, setBadgeUnlockIndex] = useState(0);
  const [showStreakCompletion, setShowStreakCompletion] = useState(false);
  const [streak, setStreak] = useState<StreakCompletionResult | null>(null);
  const [beaconProgression, setBeaconProgression] =
    useState<BeaconProgressionResult | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const choosePosition = (position: number): void => {
    if (isPending || isComplete) return;
    if (selectedPosition === position) {
      setSelectedPosition(null);
      playAudio("pick");
      return;
    }
    if (selectedPosition === null) {
      setSelectedPosition(position);
      playAudio("pick");
      return;
    }

    setTokens((current) =>
      swapTokenPositions(current, selectedPosition, position),
    );
    setPositionFeedback((current) => {
      const next = { ...current };
      delete next[selectedPosition];
      delete next[position];
      return next;
    });
    setSelectedPosition(null);
    playAudio("drop");
  };

  const checkAnswer = (): void => {
    const incorrectPositions = getIncorrectSwapPositions(tokens, verseTokens);
    const feedback = Object.fromEntries(
      tokens
        .filter(({ isSwappable }) => isSwappable)
        .map(({ position }) => [
          position,
          incorrectPositions.includes(position) ? "incorrect" : "correct",
        ]),
    ) as PositionFeedback;
    setPositionFeedback(feedback);

    if (!areSwapTokensCorrect(tokens, verseTokens)) {
      playAudio("error");
      toast.error(
        `${incorrectPositions.length} ${
          incorrectPositions.length === 1 ? "word is" : "words are"
        } still out of place.`,
        { duration: Infinity },
      );
      return;
    }

    const submittedAnswer = reconstructSwapAnswer(tokens, verseTokens);
    if (replayKind) {
      setIsComplete(true);
      setShowConfetti(true);
      setShowCompletion(true);
      onCompletionShown();
      playAudio("correct");
      toast.success(
        t(
          replayKind === "PLAYER_PRACTICE"
            ? "practiceCompleteToast"
            : "adminTestReplayCompleteToast",
        ),
        { duration: 4_000 },
      );
      return;
    }
    if (!attempt) return;

    startTransition(async () => {
      const result = await completeGameModeAction({
        sessionId,
        attemptId: attempt.id,
        gameMode: "SWAP",
        submittedAnswer,
      });
      if (!result.success) {
        playAudio("error");
        showActionError(result);
        return;
      }

      setStreak(
        result.data?.status === "mode-complete" ||
          result.data?.status === "day-complete" ||
          result.data?.status === "vault-complete"
          ? result.data.streak
          : null,
      );
      setBeaconProgression(
        result.data?.status === "mode-complete" ||
          result.data?.status === "day-complete"
          ? result.data.beaconProgression
          : null,
      );
      const unlocks =
        result.data?.status === "mode-complete" ||
        result.data?.status === "day-complete" ||
        result.data?.status === "vault-complete"
          ? result.data.badgeUnlocks
          : [];
      setBadgeUnlocks(unlocks);
      setBadgeUnlockIndex(0);
      setIsComplete(true);
      setShowConfetti(true);
      // WHY: The completed mode is the cause of every reward that follows, so
      // its success screen always leads the celebration sequence.
      setShowCompletion(true);
      onCompletionShown();
      playAudio("correct");
      toast.success("Swap complete!", { duration: 4_000 });
    });
  };

  const resetTokens = (): void => {
    setTokens(initialTokens);
    setSelectedPosition(null);
    setPositionFeedback({});
  };

  const replayTestMode = (): void => {
    resetTokens();
    setIsComplete(false);
    setShowConfetti(false);
    setShowCompletion(false);
    setBadgeUnlocks([]);
    setBadgeUnlockIndex(0);
  };

  return (
    <>
      <ConfettiCelebration show={showConfetti} />
      {badgeUnlocks[badgeUnlockIndex] && !showCompletion && (
        <BadgeUnlockSequence
          badges={badgeUnlocks}
          index={badgeUnlockIndex}
          onAdvance={() => {
            if (badgeUnlockIndex + 1 < badgeUnlocks.length) {
              setBadgeUnlockIndex((current) => current + 1);
            } else {
              setBadgeUnlocks([]);
              if (streak && streak.status !== "unchanged") {
                setShowStreakCompletion(true);
              } else {
                onContinue();
              }
            }
          }}
        />
      )}
      {showCompletion && (
        <ModeCompletionScreen
          completedMode="SWAP"
          nextMode={nextMode}
          replayKind={replayKind}
          isAdminTest={isAdminTest}
          isVaultReplay={isVaultReplay}
          beaconProgression={beaconProgression}
          onContinue={() => {
            if (replayKind) onReplayExit?.();
            else if (badgeUnlocks[badgeUnlockIndex]) {
              setShowCompletion(false);
            }
            else if (streak && streak.status !== "unchanged") {
              setShowCompletion(false);
              setShowStreakCompletion(true);
            } else onContinue();
          }}
          onReplay={replayKind ? replayTestMode : undefined}
        />
      )}
      {showStreakCompletion && streak && (
        <StreakCompletionScreen streak={streak} onContinue={onContinue} />
      )}
      <section className={styles.mode} aria-labelledby="swap-title">
        <div className={styles.challenge} data-mode="SWAP">
          <ActiveModeHeading mode="SWAP" />

          <div
            className={styles.verse}
            aria-label="Verse with words to swap"
          >
            {tokens.map((token) => {
              const canonicalToken = verseTokens[token.position];
              if (!canonicalToken) return null;
              if (!token.isSwappable) {
                return (
                  <span key={token.position} className="mx-0.5 inline-block">
                    {canonicalToken.text}
                  </span>
                );
              }

              const feedback = positionFeedback[token.position] ?? null;
              return (
                <span
                  key={token.position}
                  className="mx-1 my-1.5 inline-flex items-center align-middle"
                >
                  {canonicalToken.leadingPunctuation}
                  <button
                    type="button"
                    className={cn(
                      "inline-flex min-h-11 touch-manipulation items-center justify-center rounded-tile border px-3 py-1 align-middle font-bold transition",
                      GAMEPLAY_TILE_STATE_STYLES.available,
                      GAMEPLAY_TILE_STATE_STYLES.focus,
                      selectedPosition === token.position &&
                        `scale-105 ${GAMEPLAY_TILE_STATE_STYLES.selected}`,
                      feedback === "correct" && GAMEPLAY_TILE_STATE_STYLES.correct,
                      feedback === "incorrect" && GAMEPLAY_TILE_STATE_STYLES.incorrect,
                    )}
                    disabled={isPending || isComplete}
                    aria-pressed={selectedPosition === token.position}
                    aria-label={`${token.text}, swap position ${token.position + 1}. ${
                      selectedPosition === token.position
                        ? "Selected; choose another highlighted word."
                        : "Select this word."
                    }`}
                    onClick={() => choosePosition(token.position)}
                  >
                    {token.text}
                  </button>
                  {canonicalToken.trailingPunctuation}
                </span>
              );
            })}
          </div>

          <SwapTileLegend />
        </div>

        <div className={styles.actions}>
          <Button
            type="button"
            variant="outline"
            className="text-primary"
            disabled={isPending || isComplete}
            onClick={resetTokens}
          >
            <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
            {t("reset")}
          </Button>
          <LoadingButton
            isPending={isPending}
            pendingLabel={t("checking")}
            className="min-h-12 rounded-game-action font-bold"
            disabled={isComplete}
            onClick={checkAnswer}
          >
            <CheckIcon aria-hidden="true" />
            {t("check")}
          </LoadingButton>
        </div>
      </section>
    </>
  );
}
