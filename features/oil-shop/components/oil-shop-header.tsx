import Image from "next/image";
import { useTranslations } from "next-intl";
import styles from "./shop-screen.module.css";

/** Responsive welcoming hero; code owns surfaces while the approved cutout keeps its proportions. */
export function OilShopHeader({
  isPreview = false,
  children,
}: {
  isPreview?: boolean;
  children: React.ReactNode;
}): React.ReactNode {
  const t = useTranslations("Shop");
  const Heading = isPreview ? "h2" : "h1";
  return (
    <header className={styles.hero}>
      <div className={styles.heroCopy}>
        <Heading className={styles.title}>{t("title")}</Heading>
        <p className={styles.subtitle}>{t("subtitle")}</p>
        {children}
      </div>
      <div className={styles.heroArt}>
        <div className={styles.heroHalo} aria-hidden="true" />
        <Image
          src="/images/mascot/meemo/meemo-shop-welcome-owner.png"
          alt={t("heroAlt")}
          fill
          className="object-contain object-bottom"
          sizes="(max-width: 640px) 50vw, 320px"
          preload={!isPreview}
        />
      </div>
    </header>
  );
}
