"use client";

/** Docked chapter audio: native events drive time, with no polling or autoplay.
 * Remounting for another chapter/edition stops the previous recording. */
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { useTranslations } from "next-intl";
import { motion, useIsPresent } from "framer-motion";
import { useReducedMotionPreference } from "@/hooks/use-reduced-motion-preference";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { PauseIcon, PlayIcon, RotateCcwIcon, RotateCwIcon } from "lucide-react";
import { bibleReferenceLabel } from "../lib/bible-reference";
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
}: {
  audio: Record<string, string>;
  reference: BibleReference;
}): React.ReactNode {
  const t = useTranslations("Bible");
  const present = useIsPresent();
  const reduceMotion = useReducedMotionPreference();
  const dockRef = useBibleDockHeight("--bible-audio-height");
  const media = useRef<HTMLAudioElement>(null);
  const playRequest = useRef(0);
  const snapshot = useSyncExternalStore(
    subscribeBibleAudioPreferences,
    readBibleAudioSnapshot,
    () => "",
  );
  const stored = parseBibleAudioPreferences(snapshot);
  const [unsaved, setUnsaved] = useState<BibleAudioPreferences | null>(null);
  const preferences = unsaved ?? stored;
  const names = Object.keys(audio);
  const narrator = names.includes(preferences.narrator)
    ? preferences.narrator
    : (names[0] ?? "");
  const speed = preferences.speed;
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (media.current) media.current.playbackRate = speed;
  }, [speed]);
  useEffect(() => {
    // Stop immediately when dismissed, including while the exit animation runs.
    if (!present) {
      playRequest.current += 1;
      media.current?.pause();
    }
  }, [present]);
  useEffect(() => {
    const element = media.current;
    return () => {
      playRequest.current += 1;
      element?.pause();
    };
  }, []);

  /** Blocked storage preserves the in-session choice and reports a save failure
   * without disabling playback. No Server Action or database is involved. */
  function choose(value: BibleAudioPreferences): void {
    setUnsaved(value);
    try {
      saveBibleAudioPreferences(value);
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
    media.current?.pause();
    setPlaying(false);
    setStarting(false);
    setPosition(0);
    setDuration(0);
    setFailed(false);
    choose({ speed, narrator: name });
  }

  async function togglePlayback(): Promise<void> {
    const element = media.current;
    if (!element) return;
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
      className="bible-audio-dock"
      aria-label={t("audio")}
      inert={!present}
      initial={{ y: reduceMotion ? 0 : "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: reduceMotion ? 0 : "100%", opacity: 0 }}
      transition={{
        duration: reduceMotion ? 0.1 : 0.28,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {!names.length ? (
        <p className="text-sm text-muted-foreground">
          {t("audioUnavailable", { translation: reference.translation })}
        </p>
      ) : (
        <>
          <div className="flex min-w-0 items-center justify-between gap-2 text-sm">
            <h2 className="min-w-0 truncate font-heading text-base">
              {bibleReferenceLabel({ ...reference, verse: undefined })} ·{" "}
              {reference.translation}
            </h2>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {clock(position)} / {clock(duration)}
            </span>
          </div>
          <audio
            ref={media}
            src={audio[narrator]}
            preload="none"
            onTimeUpdate={() => setPosition(media.current?.currentTime ?? 0)}
            onLoadedMetadata={() => {
              const element = media.current;
              setDuration(
                element && Number.isFinite(element.duration)
                  ? element.duration
                  : 0,
              );
              if (element) element.playbackRate = speed;
            }}
            onPlay={() => setPlaying(true)}
            onPlaying={() => setStarting(false)}
            onWaiting={() => setStarting(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => {
              setPlaying(false);
              setStarting(false);
            }}
            onError={() => {
              setFailed(true);
              setStarting(false);
              toast.error(t("audioFailed"));
            }}
          />
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
              if (media.current) {
                media.current.currentTime = Number(event.target.value);
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
                if (media.current) media.current.playbackRate = next;
              }}
            />
            <div className="flex items-center justify-center gap-2">
              <SkipButton
                forward={false}
                disabled={!duration}
                label={t("backTen")}
                onClick={() => {
                  if (media.current)
                    media.current.currentTime = Math.max(
                      0,
                      media.current.currentTime - 10,
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
                  if (media.current)
                    media.current.currentTime = Math.min(
                      duration,
                      media.current.currentTime + 10,
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
    </motion.section>
  );
}
