import type { GameMode } from "@/lib/generated/prisma/enums";
import styles from "./session-introduction.module.css";

/** Code-native arrows illustrate motion without requiring a new icon collection. */
function SwapArrows(): React.ReactNode {
  return (
    <svg className={styles.swapArrows} viewBox="0 0 200 140" fill="none" aria-hidden="true">
      <path d="M70 28 C90 5 120 7 139 29 M139 29 L133 10 M139 29 L119 26" />
      <path d="M135 112 C115 137 85 133 66 112 M66 112 L72 131 M66 112 L87 116" />
    </svg>
  );
}

/** Static tutorial artwork only; it never starts or submits an attempt. */
export function ModeIllustration({ mode }: { mode: GameMode }): React.ReactNode {
  if (mode === "SWAP") {
    return (
      <div className={styles.swapDemo} aria-hidden="true" data-demo="swap">
        <SwapArrows />
        <span className={`${styles.wordTile} ${styles.swapFirst}`} aria-hidden="true">
          trust
        </span>
        <span className={`${styles.wordTile} ${styles.swapSecond}`} aria-hidden="true">
          Lord
        </span>
      </div>
    );
  }
  if (mode === "DRAG_DROP" || mode === "PUZZLE") {
    return (
      <div className={styles.dragDemo} aria-hidden="true">
        <span className={`${styles.dragTile} ${mode === "PUZZLE" ? styles.phraseTile : ""}`}>
          {mode === "PUZZLE" ? "only begotten Son" : "Son"}
        </span>
        <svg className={styles.dragArrow} viewBox="0 0 90 70" fill="none">
          <path d="M10 14 C40 3 62 17 68 48 M68 48 L51 36 M68 48 L77 28" />
        </svg>
        <span className={styles.dragSlot}>
          <span />
        </span>
      </div>
    );
  }
  return (
    <div className={styles.typingDemo} aria-hidden="true">
      <span className={styles.typingTile}>
        {mode === "CUE" && <span className={styles.firstLetter}>t</span>}
        <span className={styles.blankLine} />
        <span className={styles.caret} />
      </span>
      <span className={styles.typingContext}>in the Lord</span>
    </div>
  );
}

