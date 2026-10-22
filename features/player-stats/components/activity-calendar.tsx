"use client";

/** Accessible year overview plus 44px month/day controls; all interaction is local. */
import { useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  activityLevel,
  activityMonths,
  activityWeeks,
  calendarDate,
  fillActivityDays,
  shiftCalendarDay,
} from "../lib/activity-calendar";
import type { ActivityDay } from "../schemas/player-stats.schema";
import { StatsMetricGrid } from "./stats-section";
import styles from "./player-stats.module.css";

/** Small SVG cells are a noninteractive overview; the large month grid owns day selection. */
export function ActivityCalendar({
  days,
  start,
  end,
  timeZone,
}: {
  days: ActivityDay[];
  start: string;
  end: string;
  timeZone: string;
}): React.ReactNode {
  const t = useTranslations("PlayerStats");
  const locale = useLocale();
  const chartId = useId();
  const grid = useRef<HTMLDivElement>(null);
  const filled = useMemo(
    () => fillActivityDays(start, end, days),
    [start, end, days],
  );
  const months = useMemo(() => activityMonths(start, end), [start, end]);
  const weeks = useMemo(() => activityWeeks(filled), [filled]);
  const [selectedDate, setSelectedDate] = useState(days.at(-1)?.date ?? end);
  const [monthIndex, setMonthIndex] = useState(() =>
    Math.max(0, months.indexOf(selectedDate.slice(0, 7))),
  );
  const month = months[monthIndex];
  const byDate = useMemo(
    () => new Map(filled.map((day) => [day.date, day])),
    [filled],
  );
  const selected = byDate.get(selectedDate) ?? {
    date: selectedDate,
    learning: 0,
    practice: 0,
  };
  const total = filled.reduce(
    (sum, day) => sum + day.learning + day.practice,
    0,
  );
  const learning = filled.reduce((sum, day) => sum + day.learning, 0);
  const active = filled.filter((day) => day.learning + day.practice > 0).length;
  const busiest = filled.reduce<ActivityDay | null>(
    (best, day) =>
      !best || day.learning + day.practice > best.learning + best.practice
        ? day
        : best,
    null,
  );
  const monthDate = calendarDate(`${month}-01`);
  const monthLength = new Date(
    Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const leading = (monthDate.getUTCDay() + 6) % 7;
  const labels = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, {
      weekday: "short",
      timeZone: "UTC",
    }).format(calendarDate(shiftCalendarDay("2026-01-05", index))),
  );
  const dateLabel = (date: string): string =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "full",
      timeZone: "UTC",
    }).format(calendarDate(date));
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(monthDate);
  const numbers = new Intl.NumberFormat(locale);

  /** Prefer a recorded day when browsing a month, otherwise select its last in-range date. */
  function changeMonth(index: number): void {
    setMonthIndex(index);
    const lastActivity = days
      .filter((day) => day.date.startsWith(months[index]))
      .at(-1)?.date;
    const inRange = filled.filter((day) => day.date.startsWith(months[index]));
    setSelectedDate(lastActivity ?? inRange.at(-1)?.date ?? end);
  }

  return (
    <div className={styles.activity}>
      <p className={styles.note}>
        {t("calendar.timeZone", { zone: timeZone })}
      </p>
      <div className={styles.overview}>
        <svg
          viewBox={`0 0 ${weeks.length * 12} 84`}
          role="img"
          aria-labelledby={chartId}
        >
          <title id={chartId}>
            {t("calendar.overviewLabel", { count: total })}
          </title>
          {weeks.map((week, column) =>
            week.map(
              (day, row) =>
                day && (
                  <rect
                    key={day.date}
                    x={column * 12}
                    y={row * 12}
                    width={10}
                    height={10}
                    rx={2}
                    data-level={activityLevel(day.learning + day.practice)}
                  >
                    <title>
                      {t("calendar.dayLabel", {
                        date: dateLabel(day.date),
                        count: day.learning + day.practice,
                      })}
                    </title>
                  </rect>
                ),
            ),
          )}
        </svg>
        <div className={styles.overviewDates} aria-hidden="true">
          <span>
            {new Intl.DateTimeFormat(locale, {
              dateStyle: "medium",
              timeZone: "UTC",
            }).format(calendarDate(start))}
          </span>
          <span>
            {new Intl.DateTimeFormat(locale, {
              dateStyle: "medium",
              timeZone: "UTC",
            }).format(calendarDate(end))}
          </span>
        </div>
        <div className={styles.legend} aria-label={t("calendar.legend")}>
          <span>{t("calendar.less")}</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={level}
              data-level={level}
              className={styles.legendCell}
              aria-hidden="true"
            />
          ))}
          <span>{t("calendar.more")}</span>
        </div>
      </div>
      <StatsMetricGrid
        items={[
          { label: t("calendar.completedModes"), value: numbers.format(total) },
          { label: t("calendar.activeDays"), value: numbers.format(active) },
          { label: t("calendar.learning"), value: numbers.format(learning) },
          {
            label: t("calendar.practice"),
            value: numbers.format(total - learning),
          },
        ]}
      />
      {active === 0 && (
        <p className={styles.emptyNote}>{t("calendar.empty")}</p>
      )}
      <div className={styles.calendarDetails}>
        <div className={styles.month}>
          <div className={styles.monthHeading}>
            <Button
              variant="secondary"
              size="icon-lg"
              className="min-h-11 min-w-11"
              disabled={monthIndex === 0}
              onClick={() => changeMonth(monthIndex - 1)}
              aria-label={t("calendar.previousMonth")}
            >
              <ChevronLeftIcon aria-hidden="true" />
            </Button>
            <h3 aria-live="polite">{monthLabel}</h3>
            <Button
              variant="secondary"
              size="icon-lg"
              className="min-h-11 min-w-11"
              disabled={monthIndex === months.length - 1}
              onClick={() => changeMonth(monthIndex + 1)}
              aria-label={t("calendar.nextMonth")}
            >
              <ChevronRightIcon aria-hidden="true" />
            </Button>
          </div>
          <div
            className={styles.dayGrid}
            ref={grid}
            role="group"
            aria-label={monthLabel}
          >
            {labels.map((label, index) => (
              <span key={index} className={styles.weekday}>
                {label}
              </span>
            ))}
            {Array.from({ length: leading }, (_, index) => (
              <span key={`pad-${index}`} aria-hidden="true" />
            ))}
            {Array.from({ length: monthLength }, (_, index) => {
              const date = `${month}-${String(index + 1).padStart(2, "0")}`;
              const activity = byDate.get(date);
              const count =
                (activity?.learning ?? 0) + (activity?.practice ?? 0);
              return (
                <Button
                  key={date}
                  variant="ghost"
                  className={styles.day}
                  data-date={date}
                  data-level={activityLevel(count)}
                  disabled={!activity}
                  aria-pressed={selectedDate === date}
                  aria-label={
                    activity
                      ? t("calendar.dayLabel", { date: dateLabel(date), count })
                      : t("calendar.outside", { date: dateLabel(date) })
                  }
                  onClick={() => setSelectedDate(date)}
                  onKeyDown={(event) => {
                    const offset = {
                      ArrowLeft: -1,
                      ArrowRight: 1,
                      ArrowUp: -7,
                      ArrowDown: 7,
                    }[event.key];
                    if (offset === undefined) return;
                    const target =
                      grid.current?.querySelector<HTMLButtonElement>(
                        `[data-date="${shiftCalendarDay(date, offset)}"]:not(:disabled)`,
                      );
                    if (target) {
                      event.preventDefault();
                      target.focus();
                    }
                  }}
                >
                  {numbers.format(index + 1)}
                </Button>
              );
            })}
          </div>
        </div>
        <div
          className={styles.dayDetails}
          aria-live="polite"
          aria-atomic="true"
        >
          <h3>{dateLabel(selected.date)}</h3>
          <strong className={styles.dayTotal}>
            {numbers.format(selected.learning + selected.practice)}
          </strong>
          <p>{t("calendar.completedModes")}</p>
          <dl>
            <div>
              <dt>{t("calendar.learning")}</dt>
              <dd>{numbers.format(selected.learning)}</dd>
            </div>
            <div>
              <dt>{t("calendar.practice")}</dt>
              <dd>{numbers.format(selected.practice)}</dd>
            </div>
          </dl>
          {selected.learning + selected.practice === 0 && (
            <p className={styles.note}>{t("calendar.emptyDay")}</p>
          )}
        </div>
      </div>
      {busiest && active > 0 && (
        <p className={styles.note}>
          {t("calendar.busiest", {
            date: dateLabel(busiest.date),
            count: busiest.learning + busiest.practice,
          })}
        </p>
      )}
    </div>
  );
}
