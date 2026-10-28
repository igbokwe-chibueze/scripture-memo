"use client";

/** A stable, native scroll track makes manual swipes and timed rotation share
 * one source of truth. Repeating copies keep both ends filled with artwork.
 * No background network work. Hidden pages, user interaction and reduced motion
 * pause automatic rotation; CSS retains native keyboard/touch navigation. */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BIBLE_TOPICS } from "../data/bible-catalog";
import { BibleIllustratedCard } from "./bible-illustrated-card";

const TOPIC_COUNT = BIBLE_TOPICS.length;
const LOOP_TOPICS = [...BIBLE_TOPICS, ...BIBLE_TOPICS, ...BIBLE_TOPICS];

export type BibleTopic = (typeof BIBLE_TOPICS)[number];

/** Repeating neighbours keep the viewport filled at both wrap boundaries. */
export function BibleTopicCarousel({
  onOpen,
}: {
  onOpen: (topic: BibleTopic) => void;
}): React.ReactNode {
  const t = useTranslations("Bible");
  const reduced = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const [centred, setCentred] = useState<number>(TOPIC_COUNT);
  const active = centred % TOPIC_COUNT;
  const positionRef = useRef<number>(TOPIC_COUNT);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Move an outer copy to its identical middle copy once scrolling settles.
  // Preserving its relative offset makes the recenter invisible to the reader.
  const normalise = useCallback((): void => {
    const container = track.current;
    const position = positionRef.current;
    if (!container || (position >= TOPIC_COUNT && position < TOPIC_COUNT * 2))
      return;
    const next = TOPIC_COUNT + (position % TOPIC_COUNT);
    const source = container.querySelector<HTMLElement>(
      `[data-topic-position="${position}"]`,
    );
    const target = container.querySelector<HTMLElement>(
      `[data-topic-position="${next}"]`,
    );
    if (!source || !target) return;
    positionRef.current = next;
    setCentred(next);
    container.scrollTo({
      left: container.scrollLeft + target.offsetLeft - source.offsetLeft,
      behavior: "instant",
    });
  }, []);

  const scrollToCard = useCallback(
    (index: number, forward = false): void => {
      const container = track.current;
      if (!container) return;
      const copies = [index, TOPIC_COUNT + index, TOPIC_COUNT * 2 + index];
      const nearest = copies.reduce((best, candidate) =>
        Math.abs(candidate - positionRef.current) <
        Math.abs(best - positionRef.current)
          ? candidate
          : best,
      );
      const position = forward ? positionRef.current + 1 : nearest;
      const card = container.querySelector<HTMLElement>(
        `[data-topic-position="${position}"]`,
      );
      if (!card) return;
      container.scrollTo({
        left: card.offsetLeft - (container.clientWidth - card.offsetWidth) / 2,
        behavior: reduced ? "instant" : "smooth",
      });
    },
    [reduced],
  );

  const syncActive = useCallback((): void => {
    const container = track.current;
    if (!container) return;
    const centre = container.scrollLeft + container.clientWidth / 2;
    const cards = Array.from(
      container.querySelectorAll<HTMLElement>("[data-topic-position]"),
    );
    let nearest = 0;
    let distance = Infinity;
    for (const [position, card] of cards.entries()) {
      const next = Math.abs(card.offsetLeft + card.offsetWidth / 2 - centre);
      if (next < distance) {
        distance = next;
        nearest = position;
      }
    }
    positionRef.current = nearest;
    setCentred(nearest);
    // A short debounce handles native touch momentum and browsers without
    // scrollend. It performs no network work and is cancelled on unmount.
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(normalise, 160);
  }, [normalise]);

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (paused || focused || dragging || reduced || expanded) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) scrollToCard((active + 1) % TOPIC_COUNT, true);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [active, paused, focused, dragging, reduced, expanded, scrollToCard]);

  useLayoutEffect(() => {
    const container = track.current;
    if (!container || expanded) return;
    function centreCurrent(): void {
      if (!container) return;
      const position = TOPIC_COUNT + (positionRef.current % TOPIC_COUNT);
      const card = container.querySelector<HTMLElement>(
        `[data-topic-position="${position}"]`,
      );
      if (!card) return;
      positionRef.current = position;
      container.scrollTo({
        left: card.offsetLeft - (container.clientWidth - card.offsetWidth) / 2,
        behavior: "instant",
      });
    }
    centreCurrent();
    const observer = new ResizeObserver(centreCurrent);
    observer.observe(container);
    return () => observer.disconnect();
  }, [expanded]);

  return (
    <section
      className="space-y-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-2xl font-bold">{t("topicsTitle")}</h2>
        <Button variant="ghost" onClick={() => setExpanded(!expanded)}>
          {t(expanded ? "showLess" : "viewAll")}
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      </div>
      <div
        ref={track}
        aria-label={t("topicsTitle")}
        onScroll={expanded ? undefined : syncActive}
        onPointerDown={() => setDragging(true)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onPointerLeave={() => setDragging(false)}
        className={
          expanded
            ? "relative grid grid-cols-2 gap-3"
            : "bible-topic-track relative flex snap-x snap-mandatory items-center gap-3 overflow-x-auto py-4"
        }
      >
        {(expanded ? BIBLE_TOPICS : LOOP_TOPICS).map((item, position) => {
          const index = position % TOPIC_COUNT;
          return (
            <div
              key={`${item.id}:${position}`}
              data-topic-index={index}
              data-topic-position={position}
              aria-hidden={
                !expanded && Math.abs(position - centred) > 1 ? true : undefined
              }
              inert={!expanded && Math.abs(position - centred) > 1}
              data-active={position === centred}
              className={
                expanded
                  ? "min-w-0"
                  : `min-w-0 shrink-0 basis-[calc(50%-0.375rem)] snap-center transition-transform duration-300 motion-reduce:scale-100 motion-reduce:transition-none ${position === centred ? "scale-[1.03]" : "scale-[0.97]"}`
              }
            >
              <BibleIllustratedCard
                title={t(`topics.${item.id}`)}
                subtitle={t(`topicDescriptions.${item.id}`)}
                src={`/images/bible/topic-${index % 2 === 0 ? "traveller" : "sheep"}.png`}
                compactTitle
                imagePosition={index % 2 === 0 ? "center 12%" : "center 100%"}
                onClick={() => onOpen(item)}
                className="aspect-[1.125]"
              />
            </div>
          );
        })}
      </div>
      {!expanded && (
        <div className="flex min-h-11 items-center justify-center">
          {BIBLE_TOPICS.map((item, index) => (
            <Button
              key={item.id}
              size="icon"
              variant="ghost"
              aria-label={t(`topics.${item.id}`)}
              aria-pressed={index === active}
              onClick={() => scrollToCard(index)}
              className="px-2"
            >
              <span
                aria-hidden="true"
                className={`h-2 rounded-full ${index === active ? "w-7 bg-primary" : "w-2 bg-muted-foreground/40"}`}
              />
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
