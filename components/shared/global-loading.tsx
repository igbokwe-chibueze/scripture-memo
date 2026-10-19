"use client";

/** Shared global loading composition; route-specific skeletons remain independent. */
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { chooseLoadingVerse, loadingVerseDuration, LOADING_VERSES } from "./loading-verses";
import styles from "./global-loading.module.css";

/**
 * A client-only weighted carousel avoids server/client random hydration mismatch.
 * Each pause preserves unread time. Unmount clears timers immediately; navigation
 * is never delayed, and hidden tabs consume no verse timers or database reads.
 */
export function GlobalLoading(): React.ReactNode {
  const [index, setIndex] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [coolLights, setCoolLights] = useState<number[]>([]);
  const remaining = useRef(8000);
  const verse = index === null ? null : LOADING_VERSES[index];
  const stopped = hovered || focused || hidden;

  useEffect(() => {
    // Defer initial sampling until after hydration, leaving reserved verse space.
    const initial = window.setTimeout(() => {
      // Select four distinct cool-toned fireflies once per screen appearance,
      // after hydration so server and first client markup remain identical.
      const available = Array.from({ length: 14 }, (_, light) => light);
      const selected: number[] = [];
      while (selected.length < 4) {
        const position = Math.floor(Math.random() * available.length);
        selected.push(available.splice(position, 1)[0]);
      }
      setCoolLights(selected);
      const next = chooseLoadingVerse(null);
      remaining.current = loadingVerseDuration(LOADING_VERSES[next].text);
      setIndex(next);
    }, 0);
    const visibility = (): void => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.clearTimeout(initial);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    if (index === null || stopped) return;
    const started = performance.now();
    let completed = false;
    const timer = window.setTimeout(() => {
      completed = true;
      const next = chooseLoadingVerse(index);
      remaining.current = loadingVerseDuration(LOADING_VERSES[next].text);
      setIndex(next);
    }, remaining.current);
    return () => {
      window.clearTimeout(timer);
      if (!completed) remaining.current = Math.max(0, remaining.current - (performance.now() - started));
    };
  }, [index, stopped]);

  return (
    <main className={styles.screen} aria-label="Preparing Scripture Memo">
      <div className={styles.lights} aria-hidden="true">
        {Array.from({ length: 14 }, (_, light) => (
          <span
            key={light}
            data-cool={coolLights.includes(light)}
            style={{
              left: `${(light * 29 + 7) % 100}%`,
              top: `${(light * 17 + 13) % 100}%`,
              animationDelay: `${light * -1.3}s`,
              animationDuration: `${8 + light % 5}s`,
            }}
          />
        ))}
      </div>
      <section className={styles.scene}>
        <h1 className={styles.heading}>
          Meemo is lighting the way
        </h1>
        <Image
          src="/images/mascot/meemo/meemo-loading-walk.png"
          alt=""
          width={1145}
          height={1374}
          sizes="(max-width: 640px) 80vw, 480px"
          className={styles.meemo}
        />
        <div
          className={styles.carousel}
          tabIndex={0}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
          }}
        >
          <div className={styles.verseSlot} aria-live="off">
            {verse && (
              <blockquote key={verse.reference} className={styles.verse}>
                <p>&ldquo;{verse.text}&rdquo;</p>
              </blockquote>
            )}
          </div>
        </div>
        <div className={styles.status} role="status" aria-live="polite">
          <div className={styles.indicator} aria-hidden="true">
            <span />
          </div>
          <p>Loading</p>
        </div>
      </section>
    </main>
  );
}
