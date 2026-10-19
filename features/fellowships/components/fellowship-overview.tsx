/** Overview uses saved plain text and the existing authorized leader profile. */
import { useTranslations } from "next-intl";
import { BookOpenIcon, LockKeyholeIcon, UserRoundCheckIcon, UsersRoundIcon } from "lucide-react";
import { PlayerAvatar } from "@/features/profile/components/player-avatar";
import { splitFellowshipGuidelines } from "../lib/fellowship-content";
import type { FellowshipDetailData } from "../types/fellowship.types";
import styles from "./fellowship-detail.module.css";

/** Localized defaults remain editable in Manage; React renders all saved copy as text. */
export function FellowshipOverview({
  fellowship,
}: {
  fellowship: FellowshipDetailData;
}): React.ReactNode {
  const t = useTranslations("Fellowships");
  const guidelines = splitFellowshipGuidelines(
    fellowship.guidelines || t("overview.defaultGuidelines"),
  );

  return (
    <div className={styles.overview}>
      <section className={styles.infoCard}>
        <span className={styles.infoArt} aria-hidden="true">
          <BookOpenIcon />
        </span>
        <div className={styles.infoCopy}>
          <h2 className="font-heading text-xl font-bold">{t("overview.aboutTitle")}</h2>
          <p className={styles.description}>
            {fellowship.description || t("noDescription")}
          </p>
        </div>
      </section>

      <section className={styles.infoCard}>
        <span className={styles.infoArt} aria-hidden="true">
          <UsersRoundIcon />
        </span>
        <div className={styles.infoCopy}>
          <h2 className="font-heading text-xl font-bold">{t("overview.guidelinesTitle")}</h2>
          <ul className={styles.guidelines}>
            {guidelines.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Use the persisted access setting and existing localized joining rules;
       * private approval is distinct from administrative closure/suspension. */}
      <section className={styles.infoCard}>
        <span className={styles.infoArt} aria-hidden="true">
          {fellowship.isPublic ? <UserRoundCheckIcon /> : <LockKeyholeIcon />}
        </span>
        <div className={styles.infoCopy}>
          <h2 className="font-heading text-xl font-bold">
            {t(fellowship.isPublic ? "overview.openFellowship" : "private")}
          </h2>
          <p className={styles.description}>
            {t(fellowship.isPublic ? "publicAccessDescription" : "privateAccessDescription")}
          </p>
        </div>
      </section>

      <section className={`${styles.infoCard} ${styles.leaderCard}`}>
        <PlayerAvatar
          avatarKey={fellowship.leader.avatarKey}
          frameKey={fellowship.leader.avatarFrameKey}
          displayName={fellowship.leader.displayName}
          size="md"
        />
        <div className={styles.infoCopy}>
          <h2 className="font-heading text-lg font-bold">{t("overview.ledBy")}</h2>
          <p className="font-heading text-xl font-bold wrap-anywhere">
            {fellowship.leader.displayName}
          </p>
          <p className="text-sm text-muted-foreground">{t("leader")}</p>
        </div>
      </section>
    </div>
  );
}
