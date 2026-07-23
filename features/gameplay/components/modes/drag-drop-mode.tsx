"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { CheckIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-button";
import { Button } from "@/components/ui/button";
import { showActionError } from "@/lib/errors/show-action-error";
import { completeGameModeAction } from "@/features/gameplay/actions/complete-game-mode.action";
import { BlankSlot } from "@/features/gameplay/components/modes/blank-slot";
import { WordBank } from "@/features/gameplay/components/modes/word-bank";
import { ConfettiCelebration } from "@/features/gameplay/components/confetti-celebration";
import { ModeCompletionScreen } from "@/features/gameplay/components/mode-completion-screen";
import { useAudioFeedback } from "@/features/gameplay/hooks/use-audio-feedback";
import {
  createDragDropWordBank,
  getIncorrectDragDropSlots,
  placeDragDropToken,
  reconstructDragDropAnswer,
  removeDragDropPlacement,
  type DragDropPlacements,
} from "@/features/gameplay/lib/drag-drop-state";
import {
  generateHiddenTokenIndexes,
  getSessionHiddenPercent,
} from "@/features/gameplay/lib/hidden-word-generator";
import { tokenizeVerse } from "@/features/gameplay/lib/verse-tokenizer";
import type { GameModeAttemptData } from "@/features/gameplay/types/game-session.types";
import type { DayLevel } from "@/lib/generated/prisma/enums";

type SlotFeedback = Readonly<Record<number, "correct" | "incorrect">>;

/**
 * Requires the pointer to be physically inside a blank before it is highlighted.
 *
 * Keyboard dragging has no pointer coordinates, so it retains closest-center
 * navigation. Pointer and touch input never select a merely nearby blank.
 */
const preciseBlankCollision: CollisionDetection = (args) =>
  args.pointerCoordinates ? pointerWithin(args) : closestCenter(args);

/**
 * Implements the first gameplay mode with equivalent pointer and tap workflows.
 *
 * Client checks provide immediate per-slot feedback, but only the authenticated
 * Server Action can complete the attempt. Its canonical verse and deadline
 * remain authoritative regardless of browser state.
 */
export function DragDropMode({
  sessionId,
  dayLevel,
  verseText,
  attempt,
  isTestReplay = false,
  nextMode,
  onTestReplayExit,
}: {
  sessionId: string;
  dayLevel: DayLevel;
  verseText: string;
  attempt: GameModeAttemptData | null;
  isTestReplay?: boolean;
  nextMode: GameModeAttemptData["gameMode"] | null;
  onTestReplayExit?: () => void;
}): React.ReactNode {
  const router = useRouter();
  const playAudio = useAudioFeedback();
  const [placements, setPlacements] = useState<DragDropPlacements>({});
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(null);
  const [activeDragTokenIndex, setActiveDragTokenIndex] = useState<number | null>(null);
  const [slotFeedback, setSlotFeedback] = useState<SlotFeedback>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const seed = `${sessionId}:DRAG_DROP`;
  const tokens = useMemo(() => tokenizeVerse(verseText), [verseText]);
  const hiddenTokenIndexes = useMemo(() => {
    const hiddenPercent = getSessionHiddenPercent(dayLevel, seed);
    return generateHiddenTokenIndexes(tokens, hiddenPercent, seed);
  }, [dayLevel, seed, tokens]);
  const wordBankOrder = useMemo(
    () => createDragDropWordBank(hiddenTokenIndexes, seed),
    [hiddenTokenIndexes, seed],
  );
  const placedTokenIndexes = new Set(Object.values(placements));
  const availableTokenIndexes = wordBankOrder.filter(
    (tokenIndex) => !placedTokenIndexes.has(tokenIndex),
  );
  const hiddenTokenSet = new Set(hiddenTokenIndexes);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const placeToken = (tokenIndex: number, slotIndex: number): void => {
    if (!hiddenTokenSet.has(slotIndex) || isPending || isComplete) return;
    setPlacements((current) => placeDragDropToken(current, tokenIndex, slotIndex));
    setSlotFeedback((current) => {
      const next = { ...current };
      delete next[slotIndex];
      return next;
    });
    setSelectedTokenIndex(null);
    playAudio("drop");
  };

  const handleDragEnd = ({ active, over }: DragEndEvent): void => {
    const tokenIndex = active.data.current?.tokenIndex;
    const slotIndex = over?.data.current?.slotIndex;
    if (typeof tokenIndex === "number" && typeof slotIndex === "number") {
      placeToken(tokenIndex, slotIndex);
    }
    setActiveDragTokenIndex(null);
  };

  const checkAnswer = (): void => {
    const incorrectSlots = getIncorrectDragDropSlots(hiddenTokenIndexes, placements);
    const feedback = Object.fromEntries(
      hiddenTokenIndexes.map((slotIndex) => [
        slotIndex,
        incorrectSlots.includes(slotIndex) ? "incorrect" : "correct",
      ]),
    ) as SlotFeedback;
    setSlotFeedback(feedback);

    if (incorrectSlots.length > 0) {
      playAudio("error");
      toast.error(
        `${incorrectSlots.length} ${
          incorrectSlots.length === 1 ? "answer needs" : "answers need"
        } correcting.`,
        { duration: Infinity },
      );
      return;
    }

    const submittedAnswer = reconstructDragDropAnswer(
      tokens,
      hiddenTokenIndexes,
      placements,
    );
    if (isTestReplay) {
      setIsComplete(true);
      setShowConfetti(true);
      setShowCompletion(true);
      playAudio("correct");
      toast.success("Admin test replay complete. Progress was not changed.", {
        duration: 4_000,
      });
      return;
    }
    if (!attempt) return;

    startTransition(async () => {
      const result = await completeGameModeAction({
        sessionId,
        attemptId: attempt.id,
        gameMode: "DRAG_DROP",
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
      playAudio("correct");
      toast.success("Drag & Drop complete!", { duration: 4_000 });
    });
  };

  const resetPlacements = (): void => {
    setPlacements({});
    setSelectedTokenIndex(null);
    setSlotFeedback({});
  };

  const replayTestMode = (): void => {
    resetPlacements();
    setIsComplete(false);
    setShowConfetti(false);
    setShowCompletion(false);
  };

  return (
    <>
      <ConfettiCelebration show={showConfetti} />
      {showCompletion && (
        <ModeCompletionScreen
          completedMode="DRAG_DROP"
          nextMode={nextMode}
          isTestReplay={isTestReplay}
          onContinue={() => {
            if (isTestReplay) onTestReplayExit?.();
            else router.refresh();
          }}
          onReplay={isTestReplay ? replayTestMode : undefined}
        />
      )}
      <DndContext
        id={`drag-drop-${attempt?.id ?? `test-${sessionId}`}`}
        sensors={sensors}
        collisionDetection={preciseBlankCollision}
        autoScroll={false}
        onDragStart={({ active }) => {
          const tokenIndex = active.data.current?.tokenIndex;
          setActiveDragTokenIndex(typeof tokenIndex === "number" ? tokenIndex : null);
          playAudio("pick");
        }}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDragTokenIndex(null)}
      >
        <section className="w-full max-w-2xl text-left" aria-labelledby="drag-drop-title">
          <div className="text-center">
            <p className="text-xs font-black tracking-[0.16em] text-violet-700 uppercase dark:text-violet-300">
              Restore the missing words
            </p>
            <h2 id="drag-drop-title" className="mt-2 font-heading text-3xl font-black">
              Drag & Drop
            </h2>
          </div>

          <div
            className="mt-6 rounded-2xl border border-border bg-muted/35 p-4 text-lg leading-[3.25rem] font-semibold dark:border-white/10 dark:bg-white/5 sm:p-6 sm:text-xl"
            aria-label="Verse with missing words"
          >
            {tokens.map((token) =>
              hiddenTokenSet.has(token.index) ? (
                <span key={token.index} className="mx-0.5 inline-flex items-center">
                  {token.leadingPunctuation}
                  <BlankSlot
                    slotIndex={token.index}
                    placedText={
                      placements[token.index] === undefined
                        ? null
                        : (tokens[placements[token.index]]?.wordText ?? null)
                    }
                    selectedWordAvailable={
                      selectedTokenIndex !== null || activeDragTokenIndex !== null
                    }
                    feedback={slotFeedback[token.index] ?? null}
                    disabled={isPending || isComplete}
                    onPlaceSelected={() => {
                      if (selectedTokenIndex !== null) {
                        placeToken(selectedTokenIndex, token.index);
                      }
                    }}
                    onReturnWord={() => {
                      setPlacements((current) =>
                        removeDragDropPlacement(current, token.index),
                      );
                      setSlotFeedback((current) => {
                        const next = { ...current };
                        delete next[token.index];
                        return next;
                      });
                      playAudio("drop");
                    }}
                  />
                  {token.trailingPunctuation}
                </span>
              ) : (
                <span key={token.index} className="mx-0.5 inline-block">
                  {token.text}
                </span>
              ),
            )}
          </div>

          <div className="mt-5">
            <WordBank
              tokens={tokens}
              tokenIndexes={availableTokenIndexes}
              selectedTokenIndex={selectedTokenIndex}
              disabled={isPending || isComplete}
              onSelect={(tokenIndex) => {
                setSelectedTokenIndex((current) =>
                  current === tokenIndex ? null : tokenIndex,
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
              disabled={isPending || isComplete || Object.keys(placements).length === 0}
              onClick={resetPlacements}
            >
              <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
              Reset
            </Button>
            <LoadingButton
              isPending={isPending}
              pendingLabel="Checking"
              className="min-h-12 rounded-xl bg-amber-400 font-black text-slate-950 hover:bg-amber-300"
              disabled={isComplete}
              onClick={checkAnswer}
            >
              <CheckIcon aria-hidden="true" />
              Check
            </LoadingButton>
          </div>
        </section>
        <DragOverlay>
          {activeDragTokenIndex === null ? null : (
            <span className="rounded-xl border border-amber-300 bg-amber-300 px-3 py-2 font-bold text-slate-950 shadow-2xl">
              {tokens[activeDragTokenIndex]?.wordText}
            </span>
          )}
        </DragOverlay>
      </DndContext>
    </>
  );
}
