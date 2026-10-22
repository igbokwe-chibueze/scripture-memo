"use client";

/** Year navigation is explicit; choosing a local month never makes another database request. */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LoadingButton } from "@/components/shared/loading-button";
import type { StatsPeriod } from "../schemas/player-stats.schema";
import styles from "./player-stats.module.css";

/** Read-only filter changes use a route transition with immediate pending feedback. */
export function StatsPeriodPicker({
  period,
  years,
}: {
  period: StatsPeriod;
  years: number[];
}): React.ReactNode {
  const t = useTranslations("PlayerStats");
  const router = useRouter();
  const [selection, setSelection] = useState(String(period));
  const [pending, startTransition] = useTransition();
  return (
    <form
      className={styles.periodPicker}
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(() =>
          router.push(
            selection === "recent" ? "/stats" : `/stats?year=${selection}`,
            { scroll: false },
          ),
        );
      }}
    >
      <label>
        <span>{t("calendar.period")}</span>
        <select
          value={selection}
          onChange={(event) => setSelection(event.target.value)}
          disabled={pending}
        >
          <option value="recent">{t("calendar.recent")}</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
      <LoadingButton
        type="submit"
        isPending={pending}
        pendingLabel={t("opening")}
        disabled={selection === String(period)}
      >
        {t("calendar.show")}
      </LoadingButton>
    </form>
  );
}
