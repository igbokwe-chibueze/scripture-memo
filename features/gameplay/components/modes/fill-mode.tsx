"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { ActiveModeHeading } from "../active-mode-heading";
import styles from "../active-game.module.css";
import { useTranslations } from "next-intl";
import { CheckIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "@/lib/toast";
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
import { WaypointCompletionScreen } from "@/features/gameplay/components/waypoint-completion-screen";
import { useAudioFeedback } from "@/hooks/use-audio-feedback";
import {
  limitGameplayWordInput,
  normalizeGameplayAnswer,
} from "@/features/gameplay/lib/answer-validator";
import {
  getIncorrectFillPositions,
  reconstructFillAnswer,
  type FillAnswers,
} from "@/features/gameplay/lib/fill-state";
import {
  generateHiddenTokenIndexes,
  getSessionHiddenPercent,
} from "@/features/gameplay/lib/hidden-word-generator";
import { tokenizeVerse } from "@/features/gameplay/lib/verse-tokenizer";
import type {
  GameModeAttemptData,
  LocalReplayKind,
  StreakCompletionResult,
} from "@/features/gameplay/types/game-session.types";
import type { DayRewardResult } from "@/features/rewards/types/reward.types";
import { cn } from "@/lib/utils";
import type { DayLevel, JourneyStage } from "@/lib/generated/prisma/enums";

type InputFeedback = Readonly<Record<number, "correct" | "incorrect">>;

/**
 * Implements unassisted missing-word recall as the fifth and final game mode.
 *
 * Browser feedback never completes progression by itself. The authenticated
 * completion action validates the reconstructed canonical verse, proves all
 * prior ordered modes, and performs the day transition inside one transaction.
 */
export function FillMode({
  sessionId,
  dayLevel,
  waypointNumber,
  verseReference,
  journeyStage,
  audioEnabled = false,
  onToggleAudio,
  verseText,
  attempt,
  replayKind,
  isVaultReplay = false,
  isAdminTest = false,
  nextMode,
  onContinue,
  onWaypointContinue,
  onCompletionShown,
  onReplayExit,
}: {
  sessionId: string;
  dayLevel: DayLevel;
  waypointNumber: number;
  verseReference: string;
  journeyStage?: JourneyStage;
  audioEnabled?: boolean;
  onToggleAudio?: () => void;
  verseText: string;
  attempt: GameModeAttemptData | null;
  replayKind?: LocalReplayKind;
  isVaultReplay?: boolean;
  isAdminTest?: boolean;
  nextMode: GameModeAttemptData["gameMode"] | null;
  onContinue: () => void;
  onWaypointContinue: () => void;
  onCompletionShown: () => void;
  onReplayExit?: () => void;
}): React.ReactNode {
  const t = useTranslations("Gameplay");
  const stageT = useTranslations("DaySelection");
  const stageLabel = stageT(dayLevel.toLowerCase() as "glimmer" | "glow" | "radiance");
  const playAudio = useAudioFeedback();
  const inputRefs = useRef(new Map<number, HTMLInputElement>());
  const [answers, setAnswers] = useState<FillAnswers>({});
  const [inputFeedback, setInputFeedback] = useState<InputFeedback>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [badgeUnlocks, setBadgeUnlocks] = useState<BadgeUnlockResult[]>([]);
  const [badgeUnlockIndex, setBadgeUnlockIndex] = useState(0);
  const [showStreakCompletion, setShowStreakCompletion] = useState(false);
  const [streak, setStreak] = useState<StreakCompletionResult | null>(null);
  const [showWaypointCompletion, setShowWaypointCompletion] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [earnedReward, setEarnedReward] = useState<DayRewardResult | null>(null);
  const [beaconProgression, setBeaconProgression] =
    useState<BeaconProgressionResult | null>(null);
  const [stageEarnedXp, setStageEarnedXp] = useState<number | null>(null);
  const [waypointOutcome, setWaypointOutcome] = useState<{
    unlockedWaypointNumber: number | null;
    caughtUp: boolean;
    waypointRewardTotal: number;
    totalBalance: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const seed = `${sessionId}:${dayLevel}:FILL`;
  const tokens = useMemo(() => tokenizeVerse(verseText), [verseText]);
  const hiddenTokenIndexes = useMemo(() => {
    const hiddenPercent = getSessionHiddenPercent(dayLevel, seed);
    return generateHiddenTokenIndexes(tokens, hiddenPercent, seed);
  }, [dayLevel, seed, tokens]);
  const hiddenTokenSet = new Set(hiddenTokenIndexes);

  const updateAnswer = (tokenIndex: number, value: string): void => {
    const token = tokens[tokenIndex];
    if (!token) return;
    const limitedValue = limitGameplayWordInput(value, token.normalizedText);
    setAnswers((current) => ({ ...current, [tokenIndex]: limitedValue }));
    setInputFeedback((current) => {
      const next = { ...current };
      delete next[tokenIndex];
      return next;
    });

    if (
      Array.from(normalizeGameplayAnswer(limitedValue)).length ===
      Array.from(token.normalizedText).length
    ) {
      const currentHiddenPosition = hiddenTokenIndexes.indexOf(tokenIndex);
      const nextTokenIndex = hiddenTokenIndexes[currentHiddenPosition + 1];
      if (nextTokenIndex !== undefined) {
        inputRefs.current.get(nextTokenIndex)?.focus();
      }
    }
  };

  const checkAnswer = (): void => {
    const incorrectPositions = getIncorrectFillPositions(
      tokens,
      hiddenTokenIndexes,
      answers,
    );
    const feedback = Object.fromEntries(
      hiddenTokenIndexes.map((tokenIndex) => [
        tokenIndex,
        incorrectPositions.includes(tokenIndex) ? "incorrect" : "correct",
      ]),
    ) as InputFeedback;
    setInputFeedback(feedback);

    if (incorrectPositions.length > 0) {
      playAudio("error");
      toast.error(
        `${incorrectPositions.length} ${
          incorrectPositions.length === 1 ? "word needs" : "words need"
        } correcting.`,
        { duration: Infinity },
      );
      return;
    }

    const submittedAnswer = reconstructFillAnswer(
      tokens,
      hiddenTokenIndexes,
      answers,
    );
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
        gameMode: "FILL",
        submittedAnswer,
      });
      if (!result.success) {
        playAudio("error");
        showActionError(result);
        return;
      }

      setIsComplete(true);
      setShowConfetti(true);
      setShowCompletion(true);
      onCompletionShown();
      playAudio("correct");

      const completion = result.data;
      const unlocks =
        completion?.status === "mode-complete" ||
        completion?.status === "day-complete" ||
        completion?.status === "vault-complete"
          ? completion.badgeUnlocks
          : [];
      setBadgeUnlocks(unlocks);
      setBadgeUnlockIndex(0);
      // WHY: The completed mode is the cause of every reward that follows, so
      // its success screen always leads the celebration sequence.
      setShowCompletion(true);
      setStreak(
        completion?.status === "mode-complete" ||
          completion?.status === "day-complete" ||
          completion?.status === "vault-complete"
          ? completion.streak
          : null,
      );
      setBeaconProgression(
        completion?.status === "mode-complete" ||
          completion?.status === "day-complete"
          ? completion.beaconProgression
          : null,
      );
      if (completion?.status === "day-complete") {
        setStageEarnedXp(completion.stageEarnedXp);
        setEarnedReward(completion.dayCompletion.reward);
        toast.success(
          t("stageCompleteReward", {
            stage: stageLabel,
            points: completion.dayCompletion.reward.amount,
          }),
          { duration: 4_000 },
        );
        if (completion.dayCompletion.unlockedWaypoint) {
          setWaypointOutcome({
            unlockedWaypointNumber: completion.dayCompletion.unlockedWaypoint.number,
            caughtUp: false,
            waypointRewardTotal: completion.dayCompletion.reward.waypointRewardTotal,
            totalBalance: completion.dayCompletion.reward.balance,
          });
        } else if (
          completion.dayCompletion.completedDay === "RADIANCE" &&
          completion.dayCompletion.caughtUp
        ) {
          setWaypointOutcome({
            unlockedWaypointNumber: null,
            caughtUp: true,
            waypointRewardTotal: completion.dayCompletion.reward.waypointRewardTotal,
            totalBalance: completion.dayCompletion.reward.balance,
          });
        } else if (completion.dayCompletion.nextDayUnlocksAt) {
          toast.info(t("nextStageCooldown"), {
            duration: 4_000,
          });
        }
      }
    });
  };

  const resetAnswers = (): void => {
    setAnswers({});
    setInputFeedback({});
    inputRefs.current.get(hiddenTokenIndexes[0] ?? -1)?.focus();
  };

  const replayTestMode = (): void => {
    resetAnswers();
    setIsComplete(false);
    setShowConfetti(false);
    setShowCompletion(false);
    setBadgeUnlocks([]);
    setBadgeUnlockIndex(0);
    setShowStreakCompletion(false);
    setShowWaypointCompletion(false);
    setEarnedReward(null);
    setStageEarnedXp(null);
    setWaypointOutcome(null);
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
              } else if (waypointOutcome) {
                setShowWaypointCompletion(true);
              } else {
                onContinue();
              }
            }
          }}
        />
      )}
      {showCompletion && (
        <ModeCompletionScreen
          completedMode="FILL"
          completedChallengeStage={dayLevel}
          stageSummary={
            stageEarnedXp !== null && onToggleAudio
              ? {
                  waypointNumber,
                  verseReference,
                  journeyStage,
                  earnedXp: stageEarnedXp,
                  hasMoreCelebrations: Boolean(
                    badgeUnlocks.length > 0 ||
                    (streak && streak.status !== "unchanged") ||
                    waypointOutcome,
                  ),
                  audioEnabled,
                  onToggleAudio,
                }
              : undefined
          }
          nextMode={nextMode}
          replayKind={replayKind}
          isAdminTest={isAdminTest}
          isVaultReplay={isVaultReplay}
          reward={earnedReward}
          beaconProgression={beaconProgression}
          onContinue={() => {
            if (replayKind) onReplayExit?.();
            else if (badgeUnlocks[badgeUnlockIndex]) {
              setShowCompletion(false);
            }
            else if (streak && streak.status !== "unchanged") {
              setShowCompletion(false);
              setShowStreakCompletion(true);
            } else if (waypointOutcome) {
              setShowCompletion(false);
              setShowWaypointCompletion(true);
            } else onContinue();
          }}
          onReplay={replayKind ? replayTestMode : undefined}
        />
      )}
      {showStreakCompletion && streak && (
        <StreakCompletionScreen
          streak={streak}
          onContinue={() => {
            setShowStreakCompletion(false);
            if (waypointOutcome) setShowWaypointCompletion(true);
            else onContinue();
          }}
        />
      )}
      {showWaypointCompletion && waypointOutcome && (
        <WaypointCompletionScreen
          waypointNumber={waypointNumber}
          verseReference={verseReference}
          unlockedWaypointNumber={waypointOutcome.unlockedWaypointNumber}
          caughtUp={waypointOutcome.caughtUp}
          waypointRewardTotal={waypointOutcome.waypointRewardTotal}
          totalBalance={waypointOutcome.totalBalance}
          onContinue={onWaypointContinue}
        />
      )}
      <section className={styles.mode} aria-labelledby="fill-title">
        <div className={styles.challenge} data-mode="FILL">
          <ActiveModeHeading mode="FILL" />

          <div
            className={styles.verse}
            aria-label="Verse with unassisted word inputs"
          >
            {tokens.map((token) => {
              if (!hiddenTokenSet.has(token.index)) {
                return (
                  <span key={token.index} className="mx-0.5 inline-block">
                    {token.text}
                  </span>
                );
              }

              const feedback = inputFeedback[token.index] ?? null;
              return (
                <span
                  key={token.index}
                  className="mx-1 my-1.5 inline-flex items-center align-middle"
                >
                  {token.leadingPunctuation}
                  <label
                    data-feedback={feedback ?? undefined}
                    className={cn(
                      "inline-flex min-h-11 items-center rounded-control border-2 border-dashed px-2 align-middle transition",
                      GAMEPLAY_TILE_STATE_STYLES.idle,
                      "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring",
                      feedback === "correct" && GAMEPLAY_TILE_STATE_STYLES.correct,
                      feedback === "incorrect" && GAMEPLAY_TILE_STATE_STYLES.incorrect,
                    )}
                  >
                    <span className="sr-only">
                      Enter missing word {token.index + 1}.
                    </span>
                    <input
                      id={`fill-answer-${token.index}`}
                      name={`fillAnswer-${token.index}`}
                      ref={(element) => {
                        if (element) inputRefs.current.set(token.index, element);
                        else inputRefs.current.delete(token.index);
                      }}
                      type="text"
                      value={answers[token.index] ?? ""}
                      className="min-w-12 bg-transparent px-0.5 font-bold text-inherit outline-none"
                      style={{
                        width: `${Math.max(4, Array.from(token.normalizedText).length + 1)}ch`,
                      }}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      inputMode="text"
                      maxLength={Array.from(token.normalizedText).length}
                      disabled={isPending || isComplete}
                      aria-label={`Missing word ${token.index + 1}`}
                      onChange={(event) =>
                        updateAnswer(token.index, event.currentTarget.value)
                      }
                    />
                  </label>
                  {token.trailingPunctuation}
                </span>
              );
            })}
          </div>

        </div>

        <div className={styles.actions}>
          <Button
            type="button"
            variant="outline"
            className="text-primary"
            disabled={
              isPending || isComplete || Object.keys(answers).length === 0
            }
            onClick={resetAnswers}
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
