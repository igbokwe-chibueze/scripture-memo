import Image from "next/image";
import styles from "./shop-screen.module.css";

/**
 * Reuse the owner's original transparent bulb in cards, previews and celebrations.
 * One to four overlapping bulbs communicate pack size without altering the raster
 * or stretching its proportions. Nearby quantity text provides the accessible label.
 */
export function HintPackArtwork({
  quantity,
  fit = false,
}: {
  quantity: number;
  /** Fit an explicitly sized celebration container instead of the card height. */
  fit?: boolean;
}): React.ReactNode {
  const count = quantity >= 50 ? 4 : quantity >= 25 ? 3 : quantity >= 10 ? 2 : 1;

  return (
    <div className={styles.hintArt} data-fit={fit} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className={styles.bulb}>
          <Image
            src="/images/oil-shop/hint-bulb-owner.png"
            alt=""
            fill
            sizes="(max-width: 640px) 64px, 88px"
            className="object-contain"
          />
        </span>
      ))}
    </div>
  );
}
