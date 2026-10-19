/** Presentation shared by the private library and isolated admin preview.
 * Locked text never arrives here; the server remains the study-access authority.
 */
import { useTranslations } from "next-intl";
import { BookOpenIcon, HeartIcon, LoaderCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavigationButton } from "@/components/shared/navigation-button";
import { getVaultStatus } from "../lib/vault-library";
import type { VaultVerseItem } from "../types/vault.types";
import styles from "./vault.module.css";

/** A compact card keeps the heart separate from wrapped reference/status text. */
export function VaultVerseCard({
  verse, sanctuaryHref, isPending, onFavorite, favoriteDisabled = false,
}: Readonly<{
  verse: VaultVerseItem;
  sanctuaryHref: string;
  isPending: boolean;
  onFavorite: () => void;
  favoriteDisabled?: boolean;
}>): React.ReactNode {
  const t = useTranslations("Vault");
  const status = getVaultStatus(verse);
  const available = verse.studyAccess === "AVAILABLE";
  return (
    <article className={styles.card}>
      <div className={styles.cardHeading}>
        <div className={styles.referenceRow}>
          <h3 className="font-heading text-xl font-bold">{verse.reference}</h3>
          <span className={styles.status} data-status={status}>{t(status)}</span>
        </div>
        <Button
          variant="ghost"
          className="size-11 shrink-0 rounded-full"
          aria-label={t(verse.isFavorite ? "removeFavorite" : "addFavorite", { reference: verse.reference })}
          aria-pressed={verse.isFavorite}
          aria-busy={isPending}
          disabled={favoriteDisabled || !available}
          title={!available ? t("studyLocked") : undefined}
          onClick={onFavorite}
        >
          {isPending ? <LoaderCircleIcon className="size-6 animate-spin motion-reduce:animate-none" /> : (
            <HeartIcon className={verse.isFavorite ? "size-7 fill-error text-error-text" : "size-7 text-muted-foreground"} aria-hidden="true" />
          )}
        </Button>
      </div>
      <p className="mt-1 line-clamp-1 text-base text-muted-foreground">
        {available ? verse.text : t("practiceInProgress")}
      </p>
      {status === "mastered" && <p className="mt-1 text-sm text-muted-foreground">{t("masteryAchieved")}</p>}
      <div className={styles.cardFooter}>
        {verse.packSlugs.length > 0 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpenIcon className="size-6 text-selection-text" aria-hidden="true" />
            {t("inPacks", { count: verse.packSlugs.length })}
          </p>
        )}
        {available && status !== "inProgress" && (
          <NavigationButton href={sanctuaryHref} pendingLabel={t("opening")} variant="secondary" className="ml-auto min-h-11 px-3">
            <BookOpenIcon className="size-5" aria-hidden="true" />
            {t("sanctuary")}
          </NavigationButton>
        )}
      </div>
    </article>
  );
}
