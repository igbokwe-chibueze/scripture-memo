"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CheckIcon, GripVerticalIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-button";
import { Button } from "@/components/ui/button";
import { BadgeUnlockSequence } from "@/features/badges/components/badge-unlock-screen";
import type { BadgeUnlockResult } from "@/features/badges/types/badge.types";
import type { BeaconProgressionResult } from "@/features/beacon/types/beacon.types";
import { showActionError } from "@/lib/errors/show-action-error";
import { completeGameModeAction } from "@/features/gameplay/actions/complete-game-mode.action";
import { ConfettiCelebration } from "@/features/gameplay/components/confetti-celebration";
import { ModeCompletionScreen } from "@/features/gameplay/components/mode-completion-screen";
import { StreakCompletionScreen } from "@/features/gameplay/components/streak-completion-screen";
import { PhraseBank } from "@/features/gameplay/components/modes/phrase-bank";
import { PhraseSlot } from "@/features/gameplay/components/modes/phrase-slot";
import { useAudioFeedback } from "@/features/gameplay/hooks/use-audio-feedback";
import { getSessionHiddenPercent } from "@/features/gameplay/lib/hidden-word-generator";
import { generateVersePhrases } from "@/features/gameplay/lib/phrase-generator";
import {
  createPuzzlePhraseBank,
  generateHiddenPhraseIndexes,
  getIncorrectPuzzleSlots,
  placePuzzlePhrase,
  reconstructPuzzleAnswer,
  removePuzzlePlacement,
  type PuzzlePlacements,
} from "@/features/gameplay/lib/puzzle-state";
import { tokenizeVerse } from "@/features/gameplay/lib/verse-tokenizer";
import type {
  GameModeAttemptData,
  StreakCompletionResult,
} from "@/features/gameplay/types/game-session.types";
import type { DayLevel } from "@/lib/generated/prisma/enums";
import { DRAG_OVERLAY_TILE_BEVEL } from "@/features/gameplay/constants/draggable-tile-styles";
import { cn } from "@/lib/utils";

type SlotFeedback = Readonly<Record<number, "correct" | "incorrect">>;

/**
 * Requires physical pointer overlap before a phrase destination is activated.
 *
 * Keyboard dragging retains closest-center navigation because it has no pointer
 * coordinates. Mouse and touch input cannot drop onto a merely nearby slot.
 */
const precisePhraseCollision: CollisionDetection = (args) =>
  args.pointerCoordinates ? pointerWithin(args) : closestCenter(args);

/**
 * Implements deterministic phrase ordering with equivalent drag and tap input.
 *
 * The browser provides immediate position feedback, but only the authenticated
 * completion action compares the reconstructed verse with trusted session data.
 * This preserves server authority over correctness, ordering, and deadlines.
 */
export function PuzzleMode({
  sessionId,
  dayLevel,
  verseText,
  attempt,
  isTestReplay = false,
  isVaultReplay = false,
  isAdminTest = false,
  nextMode,
  onContinue,
  onCompletionShown,
  onTestReplayExit,
}: {
  sessionId: string;
  dayLevel: DayLevel;
  verseText: string;
  attempt: GameModeAttemptData | null;
  isTestReplay?: boolean;
  isVaultReplay?: boolean;
  isAdminTest?: boolean;
  nextMode: GameModeAttemptData["gameMode"] | null;
  onContinue: () => void;
  onCompletionShown: () => void;
  onTestReplayExit?: () => void;
}): React.ReactNode {
  const t = useTranslations("Gameplay");
  const playAudio = useAudioFeedback();
  const [placements, setPlacements] = useState<PuzzlePlacements>({});
  const [selectedPhraseIndex, setSelectedPhraseIndex] = useState<number | null>(null);
  const [activeDragPhraseIndex, setActiveDragPhraseIndex] = useState<number | null>(null);
  const [slotFeedback, setSlotFeedback] = useState<SlotFeedback>({});
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
  const seed = `${sessionId}:${dayLevel}:PUZZLE`;
  const tokens = useMemo(() => tokenizeVerse(verseText), [verseText]);
  const phrases = useMemo(
    () => generateVersePhrases(tokens, `${seed}:boundaries`, dayLevel),
    [dayLevel, seed, tokens],
  );
  const hiddenPhraseIndexes = useMemo(() => {
    const hiddenPercent = getSessionHiddenPercent(dayLevel, seed);
    const minimumHiddenCount =
      dayLevel === "RADIANCE" ? phrases.length : dayLevel === "GLOW" ? 3 : 2;
    return generateHiddenPhraseIndexes(
      phrases,
      hiddenPercent,
      seed,
      minimumHiddenCount,
    );
  }, [dayLevel, phrases, seed]);
  const phraseBankOrder = useMemo(
    () => createPuzzlePhraseBank(hiddenPhraseIndexes, seed),
    [hiddenPhraseIndexes, seed],
  );
  const placedPhraseIndexes = new Set(Object.values(placements));
  const availablePhraseIndexes = phraseBankOrder.filter(
    (phraseIndex) => !placedPhraseIndexes.has(phraseIndex),
  );
  const hiddenPhraseSet = new Set(hiddenPhraseIndexes);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const placePhrase = (phraseIndex: number, slotIndex: number): void => {
    if (!hiddenPhraseSet.has(slotIndex) || isPending || isComplete) return;
    setPlacements((current) =>
      placePuzzlePhrase(current, phraseIndex, slotIndex),
    );
    setSlotFeedback((current) => {
      const next = { ...current };
      delete next[slotIndex];
      return next;
    });
    setSelectedPhraseIndex(null);
    playAudio("drop");
  };

  const handleDragEnd = ({ active, over }: DragEndEvent): void => {
    const phraseIndex = active.data.current?.phraseIndex;
    const slotIndex = over?.data.current?.slotIndex;
    if (typeof phraseIndex === "number" && typeof slotIndex === "number") {
      placePhrase(phraseIndex, slotIndex);
    }
    setActiveDragPhraseIndex(null);
  };

  const checkAnswer = (): void => {
    const incorrectSlots = getIncorrectPuzzleSlots(
      phrases,
      hiddenPhraseIndexes,
      placements,
    );
    const feedback = Object.fromEntries(
      hiddenPhraseIndexes.map((slotIndex) => [
        slotIndex,
        incorrectSlots.includes(slotIndex) ? "incorrect" : "correct",
      ]),
    ) as SlotFeedback;
    setSlotFeedback(feedback);

    if (incorrectSlots.length > 0) {
      playAudio("error");
      toast.error(
        `${incorrectSlots.length} ${
          incorrectSlots.length === 1
            ? "phrase needs"
            : "phrases need"
        } reordering.`,
        { duration: Infinity },
      );
      return;
    }

    const submittedAnswer = reconstructPuzzleAnswer(
      phrases,
      hiddenPhraseIndexes,
      placements,
    );
    if (isTestReplay) {
      setIsComplete(true);
      setShowConfetti(true);
      setShowCompletion(true);
      onCompletionShown();
      playAudio("correct");
      toast.success("Admin Puzzle replay complete. Progress was not changed.", {
        duration: 4_000,
      });
      return;
    }
    if (!attempt) return;

    startTransition(async () => {
      const result = await completeGameModeAction({
        sessionId,
        attemptId: attempt.id,
        gameMode: "PUZZLE",
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
      toast.success("Puzzle complete!", { duration: 4_000 });
    });
  };

  const resetPlacements = (): void => {
    setPlacements({});
    setSelectedPhraseIndex(null);
    setSlotFeedback({});
  };

  const replayTestMode = (): void => {
    resetPlacements();
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
          completedMode="PUZZLE"
          nextMode={nextMode}
          isTestReplay={isTestReplay}
          isAdminTest={isAdminTest}
          isVaultReplay={isVaultReplay}
          beaconProgression={beaconProgression}
          onContinue={() => {
            if (isTestReplay) onTestReplayExit?.();
            else if (badgeUnlocks[badgeUnlockIndex]) {
              setShowCompletion(false);
            }
            else if (streak && streak.status !== "unchanged") {
              setShowCompletion(false);
              setShowStreakCompletion(true);
            } else onContinue();
          }}
          onReplay={isTestReplay ? replayTestMode : undefined}
        />
      )}
      {showStreakCompletion && streak && (
        <StreakCompletionScreen streak={streak} onContinue={onContinue} />
      )}
      <DndContext
        id={`puzzle-${attempt?.id ?? `test-${sessionId}`}`}
        sensors={sensors}
        collisionDetection={precisePhraseCollision}
        autoScroll={false}
        onDragStart={({ active }) => {
          const phraseIndex = active.data.current?.phraseIndex;
          setActiveDragPhraseIndex(
            typeof phraseIndex === "number" ? phraseIndex : null,
          );
          playAudio("pick");
        }}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDragPhraseIndex(null)}
      >
        <section className="w-full max-w-2xl text-left" aria-labelledby="puzzle-title">
          <div className="text-center">
            <p className="text-xs font-black tracking-[0.16em] text-violet-700 uppercase dark:text-violet-300">
              {t("restoreStructure")}
            </p>
            <h2 id="puzzle-title" className="mt-2 font-heading text-3xl font-black">
              {t("puzzle")}
            </h2>
          </div>

          <div
            className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-3 rounded-2xl border border-border bg-muted/35 p-4 text-lg leading-relaxed dark:border-white/10 dark:bg-white/5 sm:p-6 sm:text-xl"
            aria-label="Verse phrase positions"
          >
            {phrases.map((phrase) => (
              hiddenPhraseSet.has(phrase.index) ? (
                <PhraseSlot
                  key={phrase.index}
                  slotIndex={phrase.index}
                  placedText={
                    placements[phrase.index] === undefined
                      ? null
                      : (phrases[placements[phrase.index]]?.text ?? null)
                  }
                  selectedPhraseAvailable={
                    selectedPhraseIndex !== null ||
                    activeDragPhraseIndex !== null
                  }
                  feedback={slotFeedback[phrase.index] ?? null}
                  disabled={isPending || isComplete}
                  onPlaceSelected={() => {
                    if (selectedPhraseIndex !== null) {
                      placePhrase(selectedPhraseIndex, phrase.index);
                    }
                  }}
                  onReturnPhrase={() => {
                    setPlacements((current) =>
                      removePuzzlePlacement(current, phrase.index),
                    );
                    setSlotFeedback((current) => {
                      const next = { ...current };
                      delete next[phrase.index];
                      return next;
                    });
                    playAudio("drop");
                  }}
                />
              ) : (
                <span key={phrase.index} className="py-2 font-bold text-foreground">
                  {phrase.text}
                </span>
              )
            ))}
          </div>

          <div className="mt-5">
            <PhraseBank
              phrases={phrases}
              phraseIndexes={availablePhraseIndexes}
              selectedPhraseIndex={selectedPhraseIndex}
              disabled={isPending || isComplete}
              onSelect={(phraseIndex) => {
                setSelectedPhraseIndex((current) =>
                  current === phraseIndex ? null : phraseIndex,
                );
                playAudio("pick");
              }}
            />
          </div>

          <div className="mt-5 grid grid-cols-[auto_1fr] gap-3">
            <Button
              type="button"
              variant="ghost"
              className="min-h-12 rounded-xl px-4 text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-white/10 dark:hover:text-white"
              disabled={
                isPending ||
                isComplete ||
                Object.keys(placements).length === 0
              }
              onClick={resetPlacements}
            >
              <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
              {t("reset")}
            </Button>
            <LoadingButton
              isPending={isPending}
              pendingLabel={t("checking")}
              className="min-h-12 rounded-xl bg-amber-400 font-black text-slate-950 hover:bg-amber-300"
              disabled={isComplete}
              onClick={checkAnswer}
            >
              <CheckIcon aria-hidden="true" />
              {t("check")}
            </LoadingButton>
          </div>
        </section>
        <DragOverlay>
          {activeDragPhraseIndex === null ? null : (
            <span
              className={cn(
                "flex max-w-sm items-center gap-2 rounded-2xl px-4 py-3 font-bold",
                DRAG_OVERLAY_TILE_BEVEL,
              )}
            >
              <GripVerticalIcon className="size-5 shrink-0 opacity-60" aria-hidden="true" />
              {phrases[activeDragPhraseIndex]?.text}
            </span>
          )}
        </DragOverlay>
      </DndContext>
    </>
  );
}
