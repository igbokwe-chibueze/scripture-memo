"use client";

import { useEffect, useState } from "react";
import { SanctuarySectionIcon, type SanctuaryContentsItem } from "./sanctuary-section-icon";
import styles from "./sanctuary.module.css";

/** Desktop scroll navigation opens collapsed sections and restores Study first.
 * This is purely presentation: no network reads or progress mutations occur.
 */
export function SanctuaryContents({
  items,
  title,
}: {
  items: SanctuaryContentsItem[];
  title: string;
}): React.ReactNode {
  const [active, setActive] = useState("");

  useEffect(() => {
    // Observe summaries as well as open sections so scrolling never requires
    // expanding everything. Disconnect when navigation/verse content changes.
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (visible) setActive(visible.target.id);
    }, { rootMargin: "-15% 0px -65% 0px" });
    for (const item of items) {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;
  return (
    <nav className={styles.contents} aria-label={title}>
      <h2 className="font-heading text-xl font-bold">{title}</h2>
      <ol>
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={active === item.id ? "location" : undefined}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById("sanctuary-study-tab")?.click();
                // Wait for React to reveal Study before measuring its anchor.
                requestAnimationFrame(() => {
                  const element = document.getElementById(item.id);
                  if (element instanceof HTMLDetailsElement) element.open = true;
                  element?.scrollIntoView({ block: "start", behavior: "instant" });
                  setActive(item.id);
                });
              }}
            >
              <SanctuarySectionIcon type={item.type} className="size-6" />
              <span>{item.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
