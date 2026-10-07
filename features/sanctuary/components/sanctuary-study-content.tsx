import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getTranslations } from "next-intl/server";
import {
  BookHeartIcon,
  BookOpenIcon,
  ListTreeIcon,
  SparklesIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SanctuaryData } from "../types/sanctuary.types";
import type { VerseStudySectionType } from "@/lib/generated/prisma/enums";

type StudySection = {
  id: string;
  type: VerseStudySectionType;
  title: string;
  markdown: string;
};

/** Stable translation keys and anchors for each persisted study-section type. */
const STUDY_SECTION_PRESENTATION: Record<
  VerseStudySectionType,
  { labelKey: string; id: string }
> = {
  BOOK_BACKGROUND: { labelKey: "bookBackground", id: "study-book-background" },
  HISTORICAL_CONTEXT: {
    labelKey: "historicalContext",
    id: "study-historical-context",
  },
  STUDY_NOTE: { labelKey: "studyNote", id: "study-note" },
  KEY_LESSON: { labelKey: "keyLesson", id: "study-key-lesson" },
  APPLICATION: { labelKey: "application", id: "study-application" },
  CROSS_REFERENCES: {
    labelKey: "crossReferences",
    id: "study-cross-references",
  },
  WORD_STUDY: { labelKey: "wordStudy", id: "study-word-study" },
  PRAYER: { labelKey: "prayer", id: "study-prayer" },
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
        h1: ({ children: value }) => <h3 className="mb-3 font-heading text-xl font-bold">{value}</h3>,
        h2: ({ children: value }) => <h3 className="mb-3 font-heading text-xl font-bold">{value}</h3>,
        h3: ({ children: value }) => <h4 className="mb-2 mt-5 font-heading font-bold first:mt-0">{value}</h4>,
        p: ({ children: value }) => <p className="mb-4 leading-7 text-foreground/78 last:mb-0 sm:leading-8">{value}</p>,
        ul: ({ children: value }) => <ul className="mb-4 list-disc space-y-3 pl-5 marker:text-violet-500">{value}</ul>,
        ol: ({ children: value }) => <ol className="mb-4 list-decimal space-y-3 pl-5 marker:font-bold marker:text-violet-500">{value}</ol>,
        li: ({ children: value }) => <li className="pl-1 leading-7 text-foreground/78">{value}</li>,
        blockquote: ({ children: value }) => (
          <blockquote className="my-5 rounded-2xl border border-amber-300/60 bg-amber-50/70 p-4 font-sans italic text-foreground/85 dark:border-amber-300/15 dark:bg-amber-950/20">
            {value}
          </blockquote>
        ),
        strong: ({ children: value }) => (
          <strong className={cn("text-foreground", softenEmphasis ? "font-normal" : "font-bold")}>{value}</strong>
        ),
        a: ({ children: value, href }) => (
          <a href={href} target="_blank" rel="noreferrer noopener" className="font-bold text-violet-700 underline underline-offset-4 dark:text-violet-300">
            {value}
          </a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

/** Identifies sections whose imported bold markup should read as normal copy. */
function usesRegularBodyWeight(type: VerseStudySectionType): boolean {
  return type === "KEY_LESSON";
}

/** Gives the most devotional sections a warmer, more prominent surface. */
function sectionTreatment(type: VerseStudySectionType): string {
  if (type === "PRAYER") return "border-amber-300/60 bg-amber-50/60 dark:border-amber-300/15 dark:bg-amber-950/18";
  if (type === "KEY_LESSON") return "border-emerald-300/60 bg-emerald-50/60 dark:border-emerald-300/15 dark:bg-emerald-950/18";
  if (type === "APPLICATION") return "border-violet-300/60 bg-violet-50/60 dark:border-violet-300/15 dark:bg-violet-950/18";
  return "border-border/70 bg-card/72";
}

/** Resolves translated section labels once on the server for article and navigation. */
async function getStudyPresentation(data: SanctuaryData): Promise<{
  sections: StudySection[];
  path: Array<{ id: string; title: string }>;
}> {
  const t = await getTranslations("Sanctuary");
  const sections = data.studySections.map((section) => {
    const presentation = STUDY_SECTION_PRESENTATION[section.type];
    return {
      id: presentation.id,
      type: section.type,
      title: t(presentation.labelKey),
      markdown: section.content,
    };
  });
  return {
    sections,
    path: [
      ...(data.tags.length > 0 ? [{ id: "study-tags", title: t("tags") }] : []),
      ...(data.reflection ? [{ id: "study-reflection", title: t("reflection") }] : []),
      ...sections.map(({ id, title }) => ({ id, title })),
    ],
  };
}

/** Server-rendered study article keeps Markdown parsing out of the client bundle. */
export async function SanctuaryStudyContent({ data }: { data: SanctuaryData }): Promise<React.ReactNode> {
  const t = await getTranslations("Sanctuary");
  const { sections, path } = await getStudyPresentation(data);
  const hasContent = path.length > 0;

  return (
    <>
      {path.length > 0 && (
        <details className="rounded-2xl border bg-card/90 p-4 lg:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-bold text-violet-700 dark:text-violet-300">
            <ListTreeIcon className="size-5" aria-hidden="true" />
            {t("contents")}
          </summary>
          <ol className="mt-2 space-y-1 border-t pt-3">
            {path.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm font-bold text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-xs text-violet-700 dark:text-violet-300">{index + 1}</span>
                  <span>{section.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </details>
      )}

      {data.tags.length > 0 && (
        <section id="study-tags" className="scroll-mt-6 rounded-3xl border border-violet-200/70 bg-card/82 p-5 dark:border-violet-300/15 sm:p-7">
          <div className="flex items-center gap-3">
            <SparklesIcon className="size-5 shrink-0 text-violet-500" aria-hidden="true" />
            <h2 className="font-heading text-xl font-bold">{t("tags")}</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.tags.map((tag) => <span key={tag} className="rounded-full border border-violet-200/70 bg-violet-500/8 px-3 py-1.5 text-sm font-normal text-foreground/78 dark:border-violet-300/15">{tag}</span>)}
          </div>
        </section>
      )}

      {data.reflection && (
        <section id="study-reflection" className="scroll-mt-6 rounded-3xl border border-emerald-300/60 bg-emerald-50/70 p-5 dark:border-emerald-300/15 dark:bg-emerald-950/20 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"><BookHeartIcon className="size-5" aria-hidden="true" /></span>
            <h2 className="font-heading text-xl font-bold">{t("reflection")}</h2>
          </div>
          <p className="mt-4 leading-7 text-foreground/78 sm:leading-8">{data.reflection}</p>
        </section>
      )}

      {hasContent ? sections.map((section) => (
        <section key={section.id} id={section.id} className={cn("scroll-mt-6 rounded-3xl border p-5 sm:p-7", sectionTreatment(section.type))}>
          <div className="mb-4 flex items-center gap-3">
            <SparklesIcon className="size-5 shrink-0 text-violet-500" aria-hidden="true" />
            <h2 className="font-heading text-xl font-bold sm:text-2xl">{section.title}</h2>
          </div>
          <StudyMarkdown softenEmphasis={usesRegularBodyWeight(section.type)}>{section.markdown}</StudyMarkdown>
        </section>
      )) : (
        <section className="rounded-3xl border border-dashed bg-card/70 p-7 text-center sm:p-10">
          <BookOpenIcon className="mx-auto size-9 text-violet-500" aria-hidden="true" />
          <h2 className="mt-4 font-heading text-xl font-bold">{t("studyComingSoon")}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{t("studyComingSoonBody")}</p>
        </section>
      )}
    </>
  );
}

/** Server-rendered desktop table of contents accompanies the interactive notes. */
export async function SanctuaryContentsNavigation({ data }: { data: SanctuaryData }): Promise<React.ReactNode> {
  const t = await getTranslations("Sanctuary");
  const { path } = await getStudyPresentation(data);
  if (path.length === 0) return null;
  return (
    <nav className="hidden rounded-3xl border bg-card/82 p-4 lg:block" aria-label={t("contents")}>
      <p className="text-xs font-bold tracking-[0.14em] text-violet-700 uppercase dark:text-violet-300">{t("contents")}</p>
      <ol className="mt-2 space-y-0.5">
        {path.map((section, index) => (
          <li key={section.id}>
            <a href={`#${section.id}`} className="flex min-h-8 items-center gap-2 rounded-lg px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-violet-500/8 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <span className="grid size-5 shrink-0 place-items-center rounded-md bg-violet-500/10 text-[0.65rem] text-violet-700 dark:text-violet-300">{index + 1}</span>
              <span className="line-clamp-1">{section.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
