"use client";

/** One account-scoped player survives every protected client-side navigation.
 * Audio and listening position are memory-only; detailed plan progress stays local.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { BibleAudioContext } from "../hooks/use-bible-audio";
import { useBibleAudioSession } from "../hooks/use-bible-audio-session";
import { useReadingPlanParticipationSync } from "../hooks/use-reading-plan-participation-sync";
import { BibleAudioPlayer } from "./bible-audio-player";
import { readBibleAudioAction } from "../actions/bible-reader.action";
import {
  readBibleAudioSnapshot,
  parseBibleAudioPreferences,
  saveBibleAudioPreferences,
  subscribeBibleAudioPreferences,
} from "../lib/bible-audio-preferences";
import { updateReadingPlanChapter } from "../lib/reading-plan-progress";
import { nextPlanAudioChapter } from "../lib/reading-plan-audio";
import { saveBibleDevicePosition } from "../lib/bible-device-position";
import {
  bibleAudioKey,
  BIBLE_AUDIO_NAVIGATE,
  BIBLE_AUDIO_REST,
} from "../lib/bible-audio-session";
import type {
  BibleAudioChapter,
  BibleAudioPlan,
} from "../types/bible-audio.types";
import type { BibleReference } from "../schemas/bible.schema";
import { toast } from "@/lib/toast";
import { showActionError } from "@/lib/errors/show-action-error";
import "./bible.css";

/** Scope is an opaque account namespace from the existing request-cached session.
 * The layout keys this provider by scope so account changes stop/clear playback.
 */
export function BibleAudioProvider({
  children,
  scope,
}: {
  children: React.ReactNode;
  scope: string;
}): React.ReactNode {
  const t = useTranslations("Bible");
  const plans = useTranslations("ReadingPlans");
  const pathname = usePathname();
  const { mediaRef, prepare } = useBibleAudioSession();
  const participation = useReadingPlanParticipationSync(scope);
  const [current, setCurrent] = useState<BibleAudioChapter | null>(null);
  const [readerKey, setReaderKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [returnRequested, setReturnRequested] = useState(false);
  const consumeReturn = useCallback((): void => setReturnRequested(false), []);
  const [fallbackAllowed, setFallbackAllowed] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const generation = useRef(0);
  useEffect(
    () => () => {
      // Account/layout disposal invalidates pending audio before it can publish
      // a navigation event into the next account's view.
      generation.current += 1;
    },
    [],
  );
  const snapshot = useSyncExternalStore(
    subscribeBibleAudioPreferences,
    readBibleAudioSnapshot,
    () => "",
  );
  const preferences = parseBibleAudioPreferences(snapshot);
  const [unsavedAutoplay, setUnsavedAutoplay] = useState<boolean | null>(null);
  const planAutoplay = unsavedAutoplay ?? preferences.planAutoplay;
  const activeKey = current
    ? bibleAudioKey(current.reference, current.plan)
    : null;
  const full = pathname === "/bible" && activeKey === readerKey;
  const miniature = Boolean(current?.started && !full);
  const open = full ? expanded : miniature;

  const attachReader = useCallback((key: string): (() => void) => {
    setReaderKey(key);
    return () => setReaderKey((active) => (active === key ? null : active));
  }, []);

  const openChapter = useCallback(
    (
      chapter: Omit<BibleAudioChapter, "started" | "audioTranslation">,
    ): void => {
      generation.current += 1;
      setAdvancing(false);
      setExpanded(true);
      setCurrent((previous) => {
        if (
          previous &&
          bibleAudioKey(previous.reference, previous.plan) ===
            bibleAudioKey(chapter.reference, chapter.plan)
        )
          return previous;
        return {
          ...chapter,
          audioTranslation: chapter.reference.translation,
          started: false,
        };
      });
    },
    [],
  );

  function toggle(
    reference: BibleReference,
    audio: Record<string, string>,
    plan?: BibleAudioPlan,
  ): void {
    if (current && bibleAudioKey(reference, plan) === activeKey)
      setExpanded(!expanded);
    else openChapter({ reference, audio, plan, autoStart: false });
  }

  function toggleAutoplay(): void {
    const next = !planAutoplay;
    setUnsavedAutoplay(next);
    try {
      saveBibleAudioPreferences({ ...preferences, planAutoplay: next });
      setUnsavedAutoplay(null);
    } catch {
      toast.error(t("audioPreferenceFailed"));
    }
  }

  function navigateToCurrent(
    translation = current?.reference.translation,
  ): void {
    if (!current || !translation) return;
    setReturnRequested(true);
    try {
      saveBibleDevicePosition({ ...current.reference, translation });
    } catch {
      toast.error(t("failed"));
    }
    if (translation !== current.reference.translation) {
      setCurrent({
        ...current,
        reference: { ...current.reference, translation },
        autoStart: false,
      });
    }
    window.dispatchEvent(
      new CustomEvent(BIBLE_AUDIO_NAVIGATE, {
        detail: {
          reference: { ...current.reference, translation },
          plan: current.plan,
        },
      }),
    );
  }

  /** Dismiss is the sole cross-route stop: invalidate pending loads before pause. */
  function dismiss(): void {
    generation.current += 1;
    mediaRef.current?.pause();
    mediaRef.current?.removeAttribute("src");
    setCurrent(null);
    setFallbackAllowed(false);
    setAdvancing(false);
  }

  /** The provider, not an unmounted route callback, owns completion and traversal.
   * Public audio-only reads avoid private-mark queries while away from the reader.
   * New requests/dismissal invalidate stale results. Rest days never get skipped.
   */
  async function finishChapter(): Promise<void> {
    if (!current?.plan) return;
    const { planId, day } = current.plan;
    try {
      updateReadingPlanChapter(current.reference, true, planId);
      toast.success(plans("chapterMarked"));
    } catch {
      toast.error(plans("storageFailed"));
      return;
    }
    if (!planAutoplay) return;
    const next = nextPlanAudioChapter(planId, day, current.reference);
    if (next.kind === "rest") {
      window.dispatchEvent(
        new CustomEvent(BIBLE_AUDIO_REST, {
          detail: { planId, day: next.day },
        }),
      );
      toast.info(t("planAudioRest"));
      return;
    }
    if (next.kind === "finished") {
      toast.success(t("planAudioFinished"));
      return;
    }
    const request = ++generation.current;
    setAdvancing(true);
    const reference = {
      ...next.chapter,
      verse: 1,
      translation: current.reference.translation,
    };
    const audioTranslation =
      current.audioTranslation === "BSB" ||
      (!Object.keys(current.audio).length && fallbackAllowed)
        ? "BSB"
        : reference.translation;
    try {
      const result = await readBibleAudioAction({
        ...reference,
        translation: audioTranslation,
      });
      if (request !== generation.current) return;
      if (!result.success || !result.data) {
        if (!result.success) showActionError(result);
        return;
      }
      // A preference change while loading must also stop the queued advance.
      if (!parseBibleAudioPreferences(readBibleAudioSnapshot()).planAutoplay)
        return;
      const chapter = {
        reference,
        audio: result.data,
        audioTranslation,
        plan: { planId, day: next.day },
        autoStart: true,
        started: true,
      };
      setCurrent(chapter);
      setExpanded(true);
      window.dispatchEvent(
        new CustomEvent(BIBLE_AUDIO_NAVIGATE, {
          detail: { reference, plan: chapter.plan, background: true },
        }),
      );
    } catch {
      if (request === generation.current) toast.error(t("audioFailed"));
    } finally {
      if (request === generation.current) setAdvancing(false);
    }
  }

  // Mini mode clears whichever navigation bar the current route actually shows.
  // ResizeObserver reacts to safe-area/zoom/wrapping; there is no polling.
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>(
      ".bible-bottom-navigation, [data-player-bottom-navigation]",
    );
    const update = (): void => {
      const height =
        nav && getComputedStyle(nav).position === "fixed"
          ? nav.getBoundingClientRect().height
          : 0;
      document.documentElement.style.setProperty(
        "--bible-mini-nav-height",
        `${height}px`,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    if (nav) observer.observe(nav);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      document.documentElement.style.removeProperty("--bible-mini-nav-height");
    };
  }, [pathname, miniature]);

  return (
    <BibleAudioContext.Provider
      value={{
        current,
        readerKey,
        expanded,
        returnRequested,
        consumeReturn,
        fallbackAllowed,
        planAutoplay,
        participationFailed: participation.failed,
        retryParticipation: participation.retry,
        prepare,
        attachReader,
        openChapter,
        toggle,
        toggleAutoplay,
      }}
    >
      {children}
      <audio ref={mediaRef} preload="none" aria-hidden="true" />
      {current && (
        <BibleAudioPlayer
          key={activeKey}
          mediaRef={mediaRef}
          reference={current.reference}
          audio={current.audio}
          audioTranslation={current.audioTranslation}
          open={open}
          miniature={miniature}
          advancing={advancing}
          autoStart={current.autoStart}
          onStarted={() =>
            setCurrent((value) =>
              value?.started
                ? value
                : value
                  ? { ...value, started: true }
                  : null,
            )
          }
          onAudioResolved={(audio, translation) =>
            setCurrent((value) =>
              value && bibleAudioKey(value.reference, value.plan) === activeKey
                ? { ...value, audio, audioTranslation: translation }
                : value,
            )
          }
          onDismiss={dismiss}
          onReturn={() => navigateToCurrent()}
          fallbackAllowed={fallbackAllowed}
          onAllowFallback={() => {
            prepare();
            setFallbackAllowed(true);
          }}
          onSwitchText={() => navigateToCurrent("BSB")}
          planPlayback={
            current.plan
              ? {
                  autoplay: planAutoplay,
                  onToggle: toggleAutoplay,
                  onEnded: () => {
                    void finishChapter();
                  },
                }
              : undefined
          }
        />
      )}
    </BibleAudioContext.Provider>
  );
}
