"use client";

/** Native media events drive playback without polling. The session retains one
 * audio element; keyed controls select its source and retain minimized position. */
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type RefObject,
} from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useReducedMotionPreference } from "@/hooks/use-reduced-motion-preference";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import {
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  RotateCwIcon,
  XIcon,
} from "lucide-react";
import { NavigationButton } from "@/components/shared/navigation-button";
import { GameArtwork } from "@/components/shared/game-artwork";
import { readBibleAudioAction } from "../actions/bible-reader.action";
import { showActionError } from "@/lib/errors/show-action-error";
import { bibleReferenceLabel, bibleReferenceUrl } from "../lib/bible-reference";
import { useBibleDockHeight } from "../hooks/use-bible-dock-height";
import {
  BIBLE_AUDIO_SPEEDS,
  parseBibleAudioPreferences,
  readBibleAudioSnapshot,
  saveBibleAudioPreferences,
  subscribeBibleAudioPreferences,
  type BibleAudioPreferences,
} from "../lib/bible-audio-preferences";
import { BibleAudioPicker } from "./bible-audio-picker";
import type { BibleReference } from "../schemas/bible.schema";

/** Unloaded or invalid durations must never render NaN/Infinity to the player. */
function clock(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

/** Visible seconds sit inside the circular arrows, with a full accessible label. */
function SkipButton({
  forward,
  disabled,
  onClick,
  label,
}: {
  forward: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
}): React.ReactNode {
  const Icon = forward ? RotateCwIcon : RotateCcwIcon;
  return (
    <Button
      size="icon-lg"
      variant="ghost"
      className="relative size-11 rounded-full"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon aria-hidden="true" className="absolute size-9" strokeWidth={1.6} />
      <span aria-hidden="true" className="text-[0.6rem] font-bold leading-none">
        10
      </span>
    </Button>
  );
}

/** Server-validated audio URLs remain unchanged. A saved narrator is applied
 * only if offered by this chapter; otherwise use its first available recording. */
export function BibleAudioPlayer({
  audio,
  reference,
  open,
  fallbackAllowed,
  onAllowFallback,
  onSwitchText,
  planPlayback,
  mediaRef,
  audioTranslation = reference.translation,
  miniature = false,
  advancing = false,
  autoStart = false,
  onStarted,
  onDismiss,
  onReturn,
  onAudioResolved,
}: {
  audio: Record<string, string>;
  reference: BibleReference;
  mediaRef: RefObject<HTMLAudioElement | null>;
  open: boolean;
  audioTranslation?: BibleReference["translation"];
  miniature?: boolean;
  advancing?: boolean;
  autoStart?: boolean;
  onStarted?: () => void;
  onDismiss?: () => void;
  onReturn?: () => void;
  onAudioResolved?: (
    audio: Record<string, string>,
    translation: BibleReference["translation"],
  ) => void;
  fallbackAllowed: boolean;
  onAllowFallback: () => void;
  onSwitchText: () => void;
  planPlayback?: {
    autoplay: boolean;
    onToggle: () => void;
    onEnded: () => void;
  };
}): React.ReactNode {
  const t = useTranslations("Bible");
  const reduceMotion = useReducedMotionPreference();
  const dockRef = useBibleDockHeight(
    "--bible-audio-height",
    open && !miniature,
  );
  const playRequest = useRef(0);
  const snapshot = useSyncExternalStore(
    subscribeBibleAudioPreferences,
    readBibleAudioSnapshot,
    () => "",
  );
  const stored = parseBibleAudioPreferences(snapshot);
  const [unsaved, setUnsaved] = useState<BibleAudioPreferences | null>(null);
  const preferences = unsaved ?? stored;
  const [fallbackAudio, setFallbackAudio] = useState<Record<
    string,
    string
  > | null>(null);
  const [fallbackFailureAttempt, setFallbackFailureAttempt] = useState<
    number | null
  >(null);
  const [fallbackAttempt, setFallbackAttempt] = useState(0);
  const needsFallback =
    !Object.keys(audio).length && reference.translation !== "BSB";
  const fallback = needsFallback || audioTranslation !== reference.translation;
  const fallbackFailed = fallbackFailureAttempt === fallbackAttempt;
  const fallbackLoading =
    fallback && fallbackAllowed && !fallbackAudio && !fallbackFailed;
  const sources = Object.keys(audio).length ? audio : (fallbackAudio ?? {});
  const names = Object.keys(sources);
  const narrator = names.includes(preferences.narrator)
    ? preferences.narrator
    : (names[0] ?? "");
  const speed = preferences.speed;
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);
  const [starting, setStarting] = useState(false);
  const autoAttempted = useRef(false);
  const explicitFallbackPlay = useRef(false);
  const source = sources[narrator];
  const { book, chapter: chapterNumber } = reference;
  const audioFailureMessage = t("audioFailed");
  const reportResolvedAudio = useEffectEvent(
    (resolved: Record<string, string>): void => {
      onAudioResolved?.(resolved, "BSB");
    },
  );

  /** Native events read current props without reconnecting (and pausing) media
   * on every UI render. The primer is never treated as a completed chapter. */
  const handleMediaEvent = useEffectEvent((event: Event): void => {
    const element = mediaRef.current;
    if (!element || !source || element.getAttribute("src") !== source) return;
    switch (event.type) {
      case "timeupdate":
        setPosition(element.currentTime);
        break;
      case "loadedmetadata":
        setDuration(Number.isFinite(element.duration) ? element.duration : 0);
        element.playbackRate = speed;
        break;
      case "play":
        setPlaying(true);
        onStarted?.();
        break;
      case "playing":
        setStarting(false);
        break;
      case "waiting":
        setStarting(true);
        break;
      case "pause":
        setPlaying(false);
        setStarting(false);
        break;
      case "ended":
        setPlaying(false);
        setStarting(false);
        if (open) planPlayback?.onEnded();
        break;
      case "error":
        setFailed(true);
        setStarting(false);
        toast.error(audioFailureMessage);
        break;
    }
  });

  useEffect(() => {
    const element = mediaRef.current;
    if (!element || !source) return;
    if (element.getAttribute("src") !== source) {
      element.pause();
      element.setAttribute("src", source);
    }
    const events = [
      "timeupdate",
      "loadedmetadata",
      "play",
      "playing",
      "waiting",
      "pause",
      "ended",
      "error",
    ];
    for (const event of events)
      element.addEventListener(event, handleMediaEvent);
    return () => {
      for (const event of events)
        element.removeEventListener(event, handleMediaEvent);
      playRequest.current += 1;
      element.pause();
    };
  }, [mediaRef, source]);

  useEffect(() => {
    if (
      !needsFallback ||
      !fallbackAllowed ||
      !open ||
      fallbackAudio ||
      fallbackFailed
    )
      return;
    let active = true;
    // Provider audio only: choosing a fallback never fetches private BSB marks.
    void readBibleAudioAction({
      book,
      chapter: chapterNumber,
      verse: 1,
      translation: "BSB",
    })
      .then((result) => {
        if (!active) return;
        if (result.success && result.data && Object.keys(result.data).length) {
          setFallbackAudio(result.data);
          reportResolvedAudio(result.data);
        } else {
          setFallbackFailureAttempt(fallbackAttempt);
          if (!result.success) showActionError(result);
          else toast.error(audioFailureMessage);
        }
      })
      .catch(() => {
        if (active) {
          setFallbackFailureAttempt(fallbackAttempt);
          toast.error(audioFailureMessage);
        }
      });
    return () => {
      active = false;
    };
    // Depend on canonical chapter fields rather than the whole reference so
    // verse selection never restarts an in-flight public audio lookup.
  }, [
    needsFallback,
    fallbackAllowed,
    open,
    fallbackAudio,
    fallbackAttempt,
    fallbackFailed,
    book,
    chapterNumber,
    audioFailureMessage,
  ]);

  useEffect(() => {
    if (!open || !source || autoAttempted.current) return;
    if (!autoStart && !explicitFallbackPlay.current) return;
    let cancelled = false;
    // Strict Mode replays mount effects. Defer the attempt until that cleanup
    // finishes, so it cannot consume our one attempt and immediately pause it.
    queueMicrotask(() => {
      if (cancelled || autoAttempted.current) return;
      const element = mediaRef.current;
      if (!element) return;
      autoAttempted.current = true;
      explicitFallbackPlay.current = false;
      const request = ++playRequest.current;
      element.playbackRate = speed;
      void element
        .play()
        .catch(() => {
          if (request === playRequest.current) toast.info(t("audioTapToPlay"));
        })
        .finally(() => {
          if (request === playRequest.current) setStarting(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [open, source, autoStart, speed, t, mediaRef]);

  useEffect(() => {
    if (mediaRef.current) mediaRef.current.playbackRate = speed;
  }, [speed, mediaRef]);
  useEffect(() => {
    // Stop immediately when dismissed, including while the exit animation runs.
    if (!open) {
      playRequest.current += 1;
      mediaRef.current?.pause();
    }
  }, [open, mediaRef]);

  /** Blocked storage preserves the in-session choice and reports a save failure
   * without disabling playback. No Server Action or database is involved. */
  function choose(
    value: Pick<BibleAudioPreferences, "speed" | "narrator">,
  ): void {
    const next = { ...preferences, ...value };
    setUnsaved(next);
    try {
      saveBibleAudioPreferences(next);
      setUnsaved(null);
    } catch {
      toast.error(t("audioPreferenceFailed"));
    }
  }

  /** Invalidate a pending play before changing sources. Native source changes
   * stop playback; the next recording always needs another explicit Play. */
  function chooseNarrator(name: string): void {
    // Re-selecting the current pill must not clear duration: the source would
    // be unchanged, so the browser would not emit fresh metadata to restore it.
    if (name === narrator) {
      choose({ speed, narrator: name });
      return;
    }
    playRequest.current += 1;
    mediaRef.current?.pause();
    setPlaying(false);
    setStarting(false);
    setPosition(0);
    setDuration(0);
    setFailed(false);
    choose({ speed, narrator: name });
  }

  async function togglePlayback(): Promise<void> {
    const element = mediaRef.current;
    if (!element) return;
    autoAttempted.current = true;
    if (playing) {
      playRequest.current += 1;
      element.pause();
      setStarting(false);
      return;
    }
    const request = ++playRequest.current;
    setStarting(true);
    try {
      if (failed) {
        element.load();
        setFailed(false);
      }
      element.playbackRate = speed;
      await element.play();
    } catch {
      if (request === playRequest.current) toast.error(t("audioFailed"));
    } finally {
      if (request === playRequest.current) setStarting(false);
    }
  }

  return (
    <motion.section
      id="bible-audio-player"
      ref={dockRef}
      className={miniature ? "bible-mini-player" : "bible-audio-dock"}
      aria-label={t("audio")}
      aria-hidden={!open}
      inert={!open}
      style={{ pointerEvents: open ? "auto" : "none" }}
      initial={{ y: reduceMotion ? 0 : "100%", opacity: 0 }}
      animate={{ y: open || reduceMotion ? 0 : "100%", opacity: open ? 1 : 0 }}
      transition={{
        duration: reduceMotion ? 0.1 : 0.28,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {miniature ? (
        <>
          <div className="flex min-w-0 items-center gap-2">
            <NavigationButton
              href={bibleReferenceUrl(reference)}
              pendingLabel={t("opening")}
              variant="ghost"
              className="min-h-11 min-w-0 flex-1 justify-start gap-2 px-1 text-left"
              onClick={onReturn}
              aria-label={t("returnToPlayingChapter")}
            >
              <GameArtwork
                name="bibleOpen"
                className="size-9 shrink-0"
                sizes="36px"
              />
              <span className="min-w-0">
                <span className="block truncate font-heading text-sm">
                  {bibleReferenceLabel({ ...reference, verse: undefined })}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {fallback
                    ? t("audioTranslationMismatch", {
                        translation: reference.translation,
                      })
                    : reference.translation}{" "}
                  · {clock(position)} / {clock(duration)}
                </span>
              </span>
            </NavigationButton>
            <Button
              size="icon-lg"
              className="size-11 shrink-0 rounded-full"
              aria-label={t(
                advancing || starting ? "loading" : playing ? "pause" : "play",
              )}
              disabled={advancing || (starting && !playing)}
              onClick={() => void togglePlayback()}
            >
              {advancing || starting ? (
                <LoadingSpinner size="sm" label={t("loading")} />
              ) : playing ? (
                <PauseIcon aria-hidden="true" />
              ) : (
                <PlayIcon aria-hidden="true" />
              )}
            </Button>
            <Button
              size="icon-lg"
              variant="ghost"
              className="size-11 shrink-0"
              aria-label={t("dismissAudio")}
              onClick={onDismiss}
            >
              <XIcon aria-hidden="true" />
            </Button>
          </div>
          <div
            className="mt-1 h-1 overflow-hidden rounded-full bg-muted"
            aria-hidden="true"
          >
            <div
              className="h-full bg-primary"
              style={{
                width: `${duration ? Math.min(100, (position / duration) * 100) : 0}%`,
              }}
            />
          </div>
        </>
      ) : !names.length ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t("audioUnavailable", { translation: reference.translation })}
          </p>
          {fallback && (
            <>
              <p className="text-sm">{t("audioFallbackExplanation")}</p>
              <Button
                disabled={fallbackLoading}
                aria-busy={fallbackLoading}
                onClick={() => {
                  explicitFallbackPlay.current = true;
                  onAllowFallback();
                  if (fallbackFailed) setFallbackAttempt((value) => value + 1);
                }}
              >
                {fallbackLoading ? (
                  <LoadingSpinner size="sm" label={t("loading")} />
                ) : (
                  <PlayIcon aria-hidden="true" />
                )}
                {t(
                  fallbackLoading
                    ? "loading"
                    : fallbackFailed
                      ? "retry"
                      : "playBsbAudio",
                )}
              </Button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex min-w-0 items-center justify-between gap-2 text-sm">
            <h2 className="min-w-0 truncate font-heading text-base">
              {bibleReferenceLabel({ ...reference, verse: undefined })} ·{" "}
              {fallback ? "BSB" : reference.translation}
            </h2>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {clock(position)} / {clock(duration)}
            </span>
          </div>
          <input
            aria-label={t("seek")}
            type="range"
            min={0}
            max={duration || 1}
            step={1}
            value={Math.min(position, duration || 1)}
            disabled={!duration}
            className="bible-audio-seek"
            style={
              {
                "--bible-progress": `${duration ? Math.min(100, (position / duration) * 100) : 0}%`,
              } as CSSProperties
            }
            onChange={(event) => {
              if (mediaRef.current) {
                mediaRef.current.currentTime = Number(event.target.value);
                setPosition(Number(event.target.value));
              }
            }}
          />
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1">
            <BibleAudioPicker
              title={t("speed")}
              description={t("chooseAudioSpeed")}
              value={`${speed}×`}
              options={BIBLE_AUDIO_SPEEDS.map((value) => `${value}×`)}
              align="left"
              onChoose={(value) => {
                const next = Number(value.replace("×", ""));
                choose({ speed: next, narrator });
                if (mediaRef.current) mediaRef.current.playbackRate = next;
              }}
            />
            <div className="flex items-center justify-center gap-2">
              <SkipButton
                forward={false}
                disabled={!duration}
                label={t("backTen")}
                onClick={() => {
                  if (mediaRef.current)
                    mediaRef.current.currentTime = Math.max(
                      0,
                      mediaRef.current.currentTime - 10,
                    );
                }}
              />
              <Button
                size="icon-lg"
                className="size-14 rounded-full"
                aria-label={t(
                  starting ? "loading" : playing ? "pause" : "play",
                )}
                aria-busy={starting}
                disabled={starting && !playing}
                onClick={() => void togglePlayback()}
              >
                {starting ? (
                  <LoadingSpinner size="sm" label={t("loading")} />
                ) : playing ? (
                  <PauseIcon aria-hidden="true" className="size-6" />
                ) : (
                  <PlayIcon aria-hidden="true" className="size-6" />
                )}
              </Button>
              <SkipButton
                forward
                disabled={!duration}
                label={t("forwardTen")}
                onClick={() => {
                  if (mediaRef.current)
                    mediaRef.current.currentTime = Math.min(
                      duration,
                      mediaRef.current.currentTime + 10,
                    );
                }}
              />
            </div>
            <BibleAudioPicker
              title={t("narrator")}
              description={t("chooseAudioNarrator")}
              value={narrator}
              options={names}
              align="right"
              onChoose={chooseNarrator}
            />
          </div>
        </>
      )}
      {!miniature && fallback && names.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs">
          <span>
            {t("audioTranslationMismatch", {
              translation: reference.translation,
            })}
          </span>
          <Button variant="ghost" size="sm" onClick={onSwitchText}>
            {t("switchTextBsb")}
          </Button>
        </div>
      )}
    </motion.section>
  );
}
