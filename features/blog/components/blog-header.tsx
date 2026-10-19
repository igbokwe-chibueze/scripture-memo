import Image from "next/image";
import Link from "next/link";
import { NavigationButton } from "@/components/shared/navigation-button";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import styles from "./blog.module.css";

/** Public navigation has no player data, auth dependency, or admin-only links. */
export function BlogHeader(): React.ReactNode {
  return (
    <header className={styles.siteHeader}>
      <Link href="/blog" className={styles.brand}>
        <Image src="/images/game-ui/bible-open.png" alt="" width={44} height={44} />
        <span>Scripture Memo <span className={styles.brandSuffix}>Journal</span></span>
      </Link>
      <div className={styles.headerActions}>
        <ThemeSwitcher />
        <NavigationButton href="/game" pendingLabel="Opening Scripture Memo" variant="outline" className="min-h-11">
          Open app
        </NavigationButton>
      </div>
    </header>
  );
}
