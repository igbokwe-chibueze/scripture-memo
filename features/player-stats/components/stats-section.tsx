/** Small feature-owned primitives keep the detailed page readable and consistent. */
import styles from "./player-stats.module.css";

/** A section is a distinct statistical topic, not another dashboard route. */
export function StatsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
      <header className={styles.sectionHeading}>
        <h2 id={`${id}-title`}>{title}</h2>
        {description && <p>{description}</p>}
      </header>
      {children}
    </section>
  );
}

/** Definition lists preserve value/label relationships while adapting to narrow screens. */
export function StatsMetricGrid({
  items,
}: {
  items: readonly { label: string; value: React.ReactNode; hint?: string }[];
}): React.ReactNode {
  return (
    <dl className={styles.metrics}>
      {items.map((item) => (
        <div key={item.label} className={styles.metric}>
          <dt>{item.label}</dt>
          <dd>
            {item.value}
            {item.hint && <p>{item.hint}</p>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
