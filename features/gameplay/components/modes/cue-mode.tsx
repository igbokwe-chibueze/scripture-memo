"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { CheckIcon, LightbulbIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-button";
import { Button } from "@/components/ui/button";
import { showActionError } from "@/lib/errors/show-action-error";
import { completeGameModeAction } from "@/features/gameplay/actions/complete-game-mode.action";
import { ConfettiCelebration } from "@/features/gameplay/components/confetti-celebration";
import { ModeCompletionScreen } from "@/features/gameplay/components/mode-completion-screen";
import { useAudioFeedback } from "@/features/gameplay/hooks/use-audio-feedback";
import {
  generateCueHiddenTokenIndexes,
  getCueWordParts,
  getIncorrectCuePositions,
  reconstructCueAnswer,
  type CueAnswers,
} from "@/features/gameplay/lib/cue-state";
import {
  limitGameplayWordInput,
  normalizeGameplayAnswer,
} from "@/features/gameplay/lib/answer-validator";
import { getSessionHiddenPercent } from "@/features/gameplay/lib/hidden-word-generator";
import { tokenizeVerse } from "@/features/gameplay/lib/verse-tokenizer";
import type { GameModeAttemptData } from "@/features/gameplay/types/game-session.types";
import { cn } from "@/lib/utils";
import type { DayLevel } from "@/lib/generated/prisma/enums";

type InputFeedback = Readonly<Record<number, "correct" | "incorrect">>;

/**
 * Implements first-letter recall without exposing the separate Hint System.
 *
 * Client validation provides immediate field feedback, while the authenticated
 * completion action reconstructs the verse and keeps canonical correctness,
 * mode order, and attempt timing authoritative on the server.
 */
export function CueMode({
  sessionId,
  dayLevel,
  verseText,
  attempt,
  isTestReplay = false,
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
  nextMode: GameModeAttemptData["gameMode"] | null;
  onContinue: () => void;
  onCompletionShown: () => void;
  onTestReplayExit?: () => void;
}): React.ReactNode {
  const playAudio = useAudioFeedback();
  const inputRefs = useRef(new Map<number, HTMLInputElement>());
  const [answers, setAnswers] = useState<CueAnswers>({});
  const [inputFeedback, setInputFeedback] = useState<InputFeedback>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const seed = `${sessionId}:${dayLevel}:CUE`;
  const tokens = useMemo(() => tokenizeVerse(verseText), [verseText]);
  const hiddenTokenIndexes = useMemo(() => {
    const hiddenPercent = getSessionHiddenPercent(dayLevel, seed);
    return generateCueHiddenTokenIndexes(tokens, hiddenPercent, seed);
  }, [dayLevel, seed, tokens]);
  const hiddenTokenSet = new Set(hiddenTokenIndexes);

  const updateAnswer = (tokenIndex: number, value: string): void => {
    const token = tokens[tokenIndex];
    if (!token) return;
    const { expectedWord } = getCueWordParts(token);
    // WHY: Cue expects only the normalized letters/numbers in the canonical
    // word. Filtering and slicing here makes the visual limit authoritative
    // even for paste, autofill, or browsers with inconsistent maxLength input.
    const limitedValue = limitGameplayWordInput(value, expectedWord);
    setAnswers((current) => ({ ...current, [tokenIndex]: limitedValue }));
    setInputFeedback((current) => {
      const next = { ...current };
      delete next[tokenIndex];
      return next;
    });

    if (
      Array.from(normalizeGameplayAnswer(limitedValue)).length ===
      Array.from(expectedWord).length
    ) {
      const currentHiddenPosition = hiddenTokenIndexes.indexOf(tokenIndex);
      const nextTokenIndex = hiddenTokenIndexes[currentHiddenPosition + 1];
      if (nextTokenIndex !== undefined) {
        inputRefs.current.get(nextTokenIndex)?.focus();
      }
    }
  };

  const checkAnswer = (): void => {
    const incorrectPositions = getIncorrectCuePositions(
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

    const submittedAnswer = reconstructCueAnswer(
      tokens,
      hiddenTokenIndexes,
      answers,
    );
    if (isTestReplay) {
      setIsComplete(true);
      setShowConfetti(true);
      setShowCompletion(true);
      onCompletionShown();
      playAudio("correct");
      toast.success("Admin Cue replay complete. Progress was not changed.", {
        duration: 4_000,
      });
      return;
    }
    if (!attempt) return;

    startTransition(async () => {
      const result = await completeGameModeAction({
        sessionId,
        attemptId: attempt.id,
        gameMode: "CUE",
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
      toast.success("Cue complete!", { duration: 4_000 });
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
  };

  return (
    <>
      <ConfettiCelebration show={showConfetti} />
      {showCompletion && (
        <ModeCompletionScreen
          completedMode="CUE"
          nextMode={nextMode}
          isTestReplay={isTestReplay}
          onContinue={() => {
            if (isTestReplay) onTestReplayExit?.();
            else onContinue();
          }}
          onReplay={isTestReplay ? replayTestMode : undefined}
        />
      )}
      <section className="w-full max-w-2xl text-left" aria-labelledby="cue-title">
        <div className="text-center">
          <p className="text-xs font-black tracking-[0.16em] text-violet-700 uppercase dark:text-violet-300">
            Recall from the first letter
          </p>
          <h2 id="cue-title" className="mt-2 font-heading text-3xl font-black">
            Cue
          </h2>
        </div>

        <div
          className="mt-6 rounded-2xl border border-border bg-muted/35 p-4 text-lg leading-[3.5rem] font-semibold dark:border-white/10 dark:bg-white/5 sm:p-6 sm:text-xl"
          aria-label="Verse with first-letter cues"
        >
          {tokens.map((token) => {
            if (!hiddenTokenSet.has(token.index)) {
              return (
                <span key={token.index} className="mx-0.5 inline-block">
                  {token.text}
                </span>
              );
            }

            const { firstLetter, expectedWord } = getCueWordParts(token);
            const feedback = inputFeedback[token.index] ?? null;
            return (
              <span key={token.index} className="mx-0.5 inline-flex items-center">
                {token.leadingPunctuation}
                <label
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-xl border-2 border-dashed border-violet-400 bg-background px-2 align-middle text-foreground transition focus-within:border-violet-600 focus-within:ring-2 focus-within:ring-violet-500/20 dark:border-violet-400 dark:bg-slate-800/80 dark:text-white",
                    feedback === "correct" &&
                      "border-emerald-500 bg-emerald-100 text-emerald-950 dark:border-emerald-400 dark:bg-emerald-400/20 dark:text-emerald-100",
                    feedback === "incorrect" &&
                      "border-red-500 bg-red-100 text-red-950 dark:border-red-400 dark:bg-red-400/20 dark:text-red-100",
                  )}
                >
                  <span className="sr-only">
                    Word {token.index + 1} begins with {firstLetter}. Enter the
                    complete word.
                  </span>
                  <input
                    ref={(element) => {
                      if (element) inputRefs.current.set(token.index, element);
                      else inputRefs.current.delete(token.index);
                    }}
                    type="text"
                    value={answers[token.index] ?? ""}
                    className="min-w-12 bg-transparent px-0.5 font-black text-inherit outline-none placeholder:font-black placeholder:text-muted-foreground/55"
                    style={{
                      width: `${Math.max(4, Array.from(expectedWord).length + 1)}ch`,
                    }}
                    placeholder={`${firstLetter}${"_".repeat(
                      Math.max(1, Array.from(expectedWord).length - 1),
                    )}`}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    inputMode="text"
                    maxLength={Array.from(expectedWord).length}
                    disabled={isPending || isComplete}
                    aria-label={`Complete word ${token.index + 1}, beginning with ${firstLetter}`}
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

        <div className="mt-5 rounded-2xl bg-muted/70 p-4 dark:bg-black/20">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-700 dark:text-violet-200">
              <LightbulbIcon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm font-black text-foreground">First-letter cue</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                The grey first letter is a cue. Type the complete word; reaching
                its exact length moves focus to the next blank.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-[auto_1fr] gap-3">
          <Button
            type="button"
            variant="ghost"
            className="min-h-12 rounded-xl px-4 text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-white/10 dark:hover:text-white"
            disabled={
              isPending || isComplete || Object.keys(answers).length === 0
            }
            onClick={resetAnswers}
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
    </>
  );
}
