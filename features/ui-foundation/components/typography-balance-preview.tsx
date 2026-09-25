import { BookOpenIcon, FlameIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DisplayFont = "geist" | "lilita" | "fredoka";
type ReadingFont = "geist" | "fredoka-medium";

type FontTreatment = {
  className: string;
  style: React.CSSProperties;
};

const DISPLAY_FONT_TREATMENTS: Record<DisplayFont, FontTreatment> = {
  geist: {
    className: "",
    style: {
      fontFamily: "var(--font-geist-sans)",
      fontWeight: 700,
    },
  },
  lilita: {
    className: "",
    style: {
      fontFamily: "var(--font-lilita-one)",
      fontWeight: 700,
    },
  },
  fredoka: {
    className: "",
    style: {
      fontFamily: "var(--font-fredoka)",
      fontWeight: 700,
    },
  },
};

const READING_FONT_TREATMENTS: Record<ReadingFont, FontTreatment> = {
  geist: {
    className: "font-sans",
    style: {
      fontFamily: "var(--font-geist-sans)",
      fontWeight: 400,
    },
  },
  "fredoka-medium": {
    className: "",
    style: {
      fontFamily: "var(--font-fredoka)",
      fontWeight: 500,
    },
  },
};

const SAMPLE_VERSE =
  "For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come, Nor height, nor depth, nor any other creature, shall be able to separate us from the love of God, which is in Christ Jesus our Lord.";

/**
 * Compares five heading, action-label, and reading-copy pairings using
 * identical game copy.
 *
 * This ADMIN-only design preview keeps each comparison treatment scoped to its
 * card while the chosen fifth pairing is now also the application-wide system.
 */
export function TypographyBalancePreview(): React.ReactNode {
  return (
    <section
      id="typography-balance"
      className="scroll-mt-24 space-y-5 rounded-3xl border bg-card p-4 shadow-sm sm:p-6"
      aria-labelledby="typography-balance-title"
    >
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">
          Typography experiment
        </p>
        <h2
          id="typography-balance-title"
          className="mt-1 font-heading text-2xl font-bold"
        >
          Typography pairings
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Compare the same game copy across five combinations. The final card
          uses Lilita One for its headline, Fredoka Bold 700 for labels and
          actions, and Fredoka Medium 500 for supporting copy and scripture.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        <TypographySample
          treatment="Geist"
          headingFont="geist"
          labelFont="geist"
          readingFont="geist"
        />
        <TypographySample
          treatment="Lilita One + Geist"
          headingFont="lilita"
          labelFont="lilita"
          readingFont="geist"
        />
        <TypographySample
          treatment="Fredoka Bold 700 + Geist"
          headingFont="fredoka"
          labelFont="fredoka"
          readingFont="geist"
        />
        <TypographySample
          treatment="Fredoka Bold 700 + Medium 500"
          headingFont="fredoka"
          labelFont="fredoka"
          readingFont="fredoka-medium"
        />
        <TypographySample
          treatment="Lilita + Fredoka"
          headingFont="lilita"
          labelFont="fredoka"
          readingFont="fredoka-medium"
        />
      </div>
    </section>
  );
}

/** Renders identical game copy so the type treatment is the only variable. */
function TypographySample({
  treatment,
  headingFont,
  labelFont,
  readingFont,
}: {
  treatment: string;
  headingFont: DisplayFont;
  labelFont: DisplayFont;
  readingFont: ReadingFont;
}): React.ReactNode {
  const headingTreatment = DISPLAY_FONT_TREATMENTS[headingFont];
  const labelTreatment = DISPLAY_FONT_TREATMENTS[labelFont];
  const readingTreatment = READING_FONT_TREATMENTS[readingFont];

  return (
    <article className="space-y-5 rounded-2xl border bg-background p-4 sm:p-5">
      <p className="text-xs font-bold tracking-[0.16em] text-muted-foreground uppercase">
        {treatment}
      </p>

      <div className="space-y-3">
        <p
          className={cn(
            "text-xs font-bold tracking-[0.18em] text-primary uppercase",
            labelTreatment.className,
          )}
          style={labelTreatment.style}
        >
          Your journey
        </p>
        <h3
          className={cn(
            "text-3xl leading-tight font-bold tracking-tight sm:text-4xl",
            headingTreatment.className,
          )}
          style={headingTreatment.style}
        >
          A Light for Your Path
        </h3>
        <p
          className={cn(
            "text-base leading-7 text-muted-foreground",
            readingTreatment.className,
          )}
          style={readingTreatment.style}
        >
          Your next verse is ready. Learn at your pace and return whenever you
          need to practice.
        </p>
      </div>

      <blockquote className="rounded-2xl border bg-muted/50 p-4">
        <BookOpenIcon
          className="mb-2 size-5 text-primary"
          aria-hidden="true"
        />
        <p
          className={cn("text-base leading-7", readingTreatment.className)}
          style={readingTreatment.style}
        >
          “{SAMPLE_VERSE}”
        </p>
        <cite
          className={cn(
            "mt-2 block text-sm not-italic text-muted-foreground",
            readingTreatment.className,
          )}
          style={readingTreatment.style}
        >
          Romans 8:38–39 · KJV
        </cite>
      </blockquote>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-full border bg-card px-4 font-bold text-primary",
            labelTreatment.className,
          )}
          style={labelTreatment.style}
        >
          <FlameIcon className="size-4" aria-hidden="true" />
          <span>GLOW +150</span>
        </div>
        <div
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-full bg-muted px-4 text-sm font-bold",
            labelTreatment.className,
          )}
          style={labelTreatment.style}
        >
          <SparklesIcon className="size-4" aria-hidden="true" />
          <span>Day 1 complete</span>
        </div>
      </div>

      <Button
        type="button"
        className={cn("min-h-12 w-full", labelTreatment.className)}
        style={labelTreatment.style}
      >
        Continue journey
      </Button>
    </article>
  );
}
