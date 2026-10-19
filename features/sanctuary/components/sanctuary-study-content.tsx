import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getTranslations } from "next-intl/server";
import { BookOpenIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SanctuaryContents } from "./sanctuary-contents";
import { SanctuarySectionIcon, type SanctuaryContentsItem } from "./sanctuary-section-icon";
import styles from "./sanctuary.module.css";
import type { SanctuaryData } from "../types/sanctuary.types";
import type { VerseStudySectionType } from "@/lib/generated/prisma/enums";

/** Stable anchors survive temporary translation changes and accordion toggles. */
const PRESENTATION: Record<VerseStudySectionType, { label: string; id: string }> = {
  BOOK_BACKGROUND: { label: "bookBackground", id: "study-book-background" },
  HISTORICAL_CONTEXT: { label: "historicalContext", id: "study-historical-context" },
  STUDY_NOTE: { label: "studyNote", id: "study-note" },
  KEY_LESSON: { label: "keyLesson", id: "study-key-lesson" },
  APPLICATION: { label: "application", id: "study-application" },
  CROSS_REFERENCES: { label: "crossReferences", id: "study-cross-references" },
  WORD_STUDY: { label: "wordStudy", id: "study-word-study" },
  PRAYER: { label: "prayer", id: "study-prayer" },
};

/** Renders trusted admin-authored Markdown while refusing embedded HTML. */
function StudyMarkdown({
  children,
  softenEmphasis = false,
}: {
  children: string;
  softenEmphasis?: boolean;
}): React.ReactNode {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      components={{
        h1: ({ children: value }) => (
          <h3 className="mb-3 font-bold">{value}</h3>
        ),
        h2: ({ children: value }) => (
          <h3 className="mb-3 font-bold">{value}</h3>
        ),
        h3: ({ children: value }) => (
          <h4 className="mb-2 mt-5 font-bold first:mt-0">{value}</h4>
        ),
        p: ({ children: value }) => (
          <p className="mb-4 last:mb-0">{value}</p>
        ),
        ul: ({ children: value }) => (
          <ul className="mb-4 list-disc space-y-2 pl-5 marker:text-selection-text">{value}</ul>
        ),
        ol: ({ children: value }) => (
          <ol className="mb-4 list-decimal space-y-2 pl-5 marker:font-bold marker:text-selection-text">{value}</ol>
        ),
        li: ({ children: value }) => (
          <li className="pl-1">{value}</li>
        ),
        blockquote: ({ children: value }) => (
          <blockquote className="my-5 rounded-2xl border border-reward-border/60 bg-reward-subtle p-4 italic text-foreground/85 dark:border-reward-border/15 dark:bg-reward">
            {value}
          </blockquote>
        ),
        strong: ({ children: value }) => (
          <strong className={cn("text-foreground", softenEmphasis ? "font-medium" : "font-bold")}>
            {value}
          </strong>
        ),
        a: ({ children: value, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="font-bold text-selection-text underline underline-offset-4"
          >
            {value}
          </a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

/** Server-rendered accordion content keeps parsing out of the client bundle.
 * Native details provide keyboard/touch toggles with no persistent UI writes.
 */
export async function SanctuaryStudyContent({
  data,
}: {
  data: SanctuaryData;
}): Promise<React.ReactNode> {
  const t = await getTranslations("Sanctuary");
  const hasContent = data.tags.length > 0 || Boolean(data.reflection) || data.studySections.length > 0;
  return (
    <>
      {data.tags.length > 0 && (
        <section id="study-tags" className={styles.tags}>
          <h2 className="font-heading text-xl font-bold">{t("tags")}</h2>
          <div>
            {data.tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </section>
      )}
      {data.reflection && (
        <details id="study-reflection" className={styles.section}>
          <summary>
            <SanctuarySectionIcon type="REFLECTION" className="size-6" />
            <h2>{t("reflection")}</h2>
            <ChevronDownIcon className={styles.chevron} aria-hidden="true" />
          </summary>
          <div className={styles.prose}>{data.reflection}</div>
        </details>
      )}
      {data.studySections.map((section) => (
        <details
          key={section.type}
          id={PRESENTATION[section.type].id}
          className={styles.section}
          open={section.type === "STUDY_NOTE" || section.type === "PRAYER"}
        >
          <summary>
            <SanctuarySectionIcon type={section.type} className="size-6" />
            <h2>{t(PRESENTATION[section.type].label)}</h2>
            <ChevronDownIcon className={styles.chevron} aria-hidden="true" />
          </summary>
          <div
            className={cn(
              styles.prose,
              section.type === "BOOK_BACKGROUND" && styles.bookBackground,
              section.type === "CROSS_REFERENCES" && styles.references,
            )}
          >
            <StudyMarkdown softenEmphasis={section.type === "KEY_LESSON"}>
              {section.content}
            </StudyMarkdown>
          </div>
        </details>
      ))}
      {!hasContent && (
        <section className="rounded-2xl border border-dashed bg-card p-7 text-center">
          <BookOpenIcon className="mx-auto size-9 text-selection-text" aria-hidden="true" />
          <h2 className="mt-4 font-heading text-xl font-bold">{t("studyComingSoon")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("studyComingSoonBody")}</p>
        </section>
      )}
    </>
  );
}

/** Only existing sections appear in the right rail; no placeholder headings. */
export async function SanctuaryContentsNavigation({
  data,
}: {
  data: SanctuaryData;
}): Promise<React.ReactNode> {
  const t = await getTranslations("Sanctuary");
  const items: SanctuaryContentsItem[] = [];
  if (data.tags.length > 0) items.push({ id: "study-tags", title: t("tags"), type: "TAGS" });
  if (data.reflection) items.push({ id: "study-reflection", title: t("reflection"), type: "REFLECTION" });
  for (const section of data.studySections) {
    items.push({
      id: PRESENTATION[section.type].id,
      title: t(PRESENTATION[section.type].label),
      type: section.type,
    });
  }
  return <SanctuaryContents items={items} title={t("onThisPage")} />;
}
