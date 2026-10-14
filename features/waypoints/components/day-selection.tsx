"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Clock3Icon, LockKeyholeIcon, ShieldOffIcon } from "lucide-react";
import { NavigationButton } from "@/components/shared/navigation-button";
import { JourneyStageBadge } from "@/components/shared/journey-stage-badge";
import { DayCard, type StartDay } from "./day-card";
import { AdminDayTestingMenu } from "./admin-day-testing-menu";
import type { DayCardData, DaySelectionData } from "../types/day-selection.types";
import { JourneyStage } from "@/lib/generated/prisma/enums";
import styles from "./day-selection.module.css";

/**
 * Reference-led waypoint composition using trusted server data. The existing
 * shell owns avatar/counters/navigation; artwork never determines permissions.
 */
export function DaySelection({
  data,
  cards,
  isAdmin,
  startDayAction,
}: {
  data: DaySelectionData;
  cards: DayCardData[];
  isAdmin: boolean;
  startDayAction?: StartDay;
}): React.ReactNode {
  const t = useTranslations("DaySelection");
  const hintsUnavailable =
    data.journeyStage === JourneyStage.STRENGTHEN ||
    data.journeyStage === JourneyStage.MASTER;
  const timeNotice = {
    [JourneyStage.LEARN]: null,
    [JourneyStage.RECALL]: t("recallTime"),
    [JourneyStage.STRENGTHEN]: t("strengthenTime"),
    [JourneyStage.MASTER]: t("masterTime"),
  }[data.journeyStage];

  return (
    <div className={styles.content}>
      <section className={styles.hero} aria-labelledby="waypoint-heading">
        <div className={styles.heroCopy}>
          <div className={styles.waypointMeta}>
            <p>{t("waypoint", { number: data.waypointNumber })}</p>
            <JourneyStageBadge stage={data.journeyStage} className={styles.stage} />
          </div>
          <h1 id="waypoint-heading" className={styles.heading}>
            {t("todayChallenge")}
          </h1>
          <p className={styles.reference}>
            {data.reference}
            <span className={styles.translation}>{data.translation}</span>
          </p>
        </div>
        <Image
          src="/images/mascot/meemo/meemo-waypoint-welcome.png"
          alt=""
          aria-hidden="true"
          width={1024}
          height={1024}
          sizes="(min-width: 1024px) 260px, 48vw"
          preload
          className={styles.meemo}
        />
      </section>

      <div className={styles.studyRow}>
        {data.studyAccess === "LOCKED" ? (
          <div className={styles.studyLocked}>
            <LockKeyholeIcon className="size-5 shrink-0" aria-hidden="true" />
            <span>{t("studyReopens")}</span>
          </div>
        ) : (
          <NavigationButton
            href={`/sanctuary/${data.verseId}`}
            pendingLabel={t("openingStudy")}
            variant="secondary"
            className={styles.studyButton}
          >
            <Image
              src="/images/game-ui/waypoints/study.png"
              alt=""
              width={80}
              height={80}
              className={styles.studyArtwork}
            />
            {t("study")}
          </NavigationButton>
        )}
        {isAdmin && (
          <div className={styles.adminTools}>
            <AdminDayTestingMenu
              waypointId={data.waypointId}
              journeyStage={data.journeyStage}
              cards={cards}
            />
          </div>
        )}
      </div>

      {/* A closed disclosure preserves pre-study scripture without crowding the
       * concept header. Locked Study never renders the scripture in the DOM. */}
      {data.studyAccess === "PRE_STUDY" && (
        <details className={styles.verseDetails}>
          <summary>{t("readVerse")} · {data.translation}</summary>
          <blockquote>{data.translationText}</blockquote>
        </details>
      )}

      {(hintsUnavailable || timeNotice) && (
        <section aria-label={t("stageRules")} className={styles.rules}>
          {hintsUnavailable && (
            <p>
              <ShieldOffIcon className="size-5 shrink-0" aria-hidden="true" />
              <span>
                <strong>{t("noHints")}</strong> {t("memoryAlone")}
              </span>
            </p>
          )}
          {timeNotice && (
            <p>
              <Clock3Icon className="size-5 shrink-0" aria-hidden="true" />
              <span>
                <strong>{t("timedChallenge")}</strong> {timeNotice}
              </span>
            </p>
          )}
        </section>
      )}

      <section aria-label={t("threeDayChallenge")} className={styles.days}>
        {cards.map((card, index) => (
          <DayCard
            key={card.dayLevel}
            card={card}
            waypointId={data.waypointId}
            index={index}
            startDayAction={startDayAction}
          />
        ))}
      </section>
    </div>
  );
}
