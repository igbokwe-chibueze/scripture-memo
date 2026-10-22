"use client";

/** Audio is explicit user-initiated playback; changing chapter unmounts and stops the prior recording. */
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { PauseIcon, PlayIcon, RotateCcwIcon, RotateCwIcon } from "lucide-react";
import { bibleReferenceLabel } from "../lib/bible-reference";
import type { BibleReference } from "../schemas/bible.schema";

function clock(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

/** Native media events drive seeking/time; no render timers, polling or automatic playback. */
export function BibleAudioPlayer({
  audio,
  reference,
}: {
  audio: Record<string, string>;
  reference: BibleReference;
}): React.ReactNode {
  const t = useTranslations("Bible");
  const media = useRef<HTMLAudioElement>(null);
  const [narrator, setNarrator] = useState(Object.keys(audio)[0] ?? "");
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [failed, setFailed] = useState(false);
  const [starting, setStarting] = useState(false);
  if (!Object.keys(audio).length)
    return (
      <section className="rounded-card border border-border bg-card p-4">
        <h2 className="font-heading text-xl">{t("audio")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("audioUnavailable", { translation: reference.translation })}
        </p>
      </section>
    );
  return (
    <section
      className="space-y-3 rounded-card border border-border bg-card p-4"
      aria-label={t("audio")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-xl">
          {bibleReferenceLabel({ ...reference, verse: undefined })} ·{" "}
          {reference.translation}
        </h2>
        <span className="tabular-nums">
          {clock(position)} / {clock(duration)}
        </span>
      </div>
      <label className="block space-y-1">
        <span className="text-sm">{t("narrator")}</span>
        <select
          className="bible-select"
          value={narrator}
          onChange={(event) => {
            media.current?.pause();
            setNarrator(event.target.value);
            setPosition(0);
            setDuration(0);
            setFailed(false);
            setStarting(false);
          }}
        >
          {Object.keys(audio).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <audio
        ref={media}
        src={audio[narrator]}
        preload="none"
        onTimeUpdate={() => setPosition(media.current?.currentTime ?? 0)}
        onLoadedMetadata={() => {
          setDuration(media.current?.duration ?? 0);
          if (media.current) media.current.playbackRate = speed;
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          setFailed(true);
          toast.error(t("audioFailed"), { duration: Infinity });
        }}
      />
      <input
        aria-label={t("seek")}
        type="range"
        min={0}
        max={duration || 1}
        step={1}
        value={position}
        disabled={!duration}
        className="min-h-11 w-full accent-primary"
        onChange={(event) => {
          if (media.current) {
            media.current.currentTime = Number(event.target.value);
            setPosition(Number(event.target.value));
          }
        }}
      />
      <div className="flex items-center justify-center gap-3">
        <Button
          size="icon"
          variant="secondary"
          aria-label={t("backTen")}
          onClick={() => {
            if (media.current)
              media.current.currentTime = Math.max(0, position - 10);
          }}
        >
          <RotateCcwIcon aria-hidden="true" />
        </Button>
        <Button
          size="icon-lg"
          aria-label={t(starting ? "loading" : playing ? "pause" : "play")}
          aria-busy={starting}
          disabled={starting && !playing}
          onClick={() => {
            if (playing) media.current?.pause();
            else {
              setStarting(true);
              if (failed) {
                media.current?.load();
                setFailed(false);
              }
              void media.current
                ?.play()
                .catch(() =>
                  toast.error(t("audioFailed"), { duration: Infinity }),
                )
                .finally(() => setStarting(false));
            }
          }}
        >
          {starting ? (
            <LoadingSpinner size="sm" label={t("loading")} />
          ) : playing ? (
            <PauseIcon aria-hidden="true" />
          ) : (
            <PlayIcon aria-hidden="true" />
          )}
        </Button>
        <Button
          size="icon"
          variant="secondary"
          aria-label={t("forwardTen")}
          onClick={() => {
            if (media.current && duration)
              media.current.currentTime = Math.min(duration, position + 10);
          }}
        >
          <RotateCwIcon aria-hidden="true" />
        </Button>
        <select
          aria-label={t("speed")}
          className="bible-select max-w-20"
          value={speed}
          onChange={(event) => {
            const value = Number(event.target.value);
            setSpeed(value);
            if (media.current) media.current.playbackRate = value;
          }}
        >
          {[0.75, 1, 1.25, 1.5, 2].map((value) => (
            <option key={value} value={value}>
              {value}×
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("audioAttribution")} ·{" "}
        <a
          className="underline"
          href="https://bible.helloao.org/docs/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Free Use Bible API
        </a>
      </p>
    </section>
  );
}
