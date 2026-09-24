import { BookOpenIcon, FlameIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISPLAY_FONT_STYLE = {
  fontFamily: "var(--font-lilita-one)",
} as const;

const READING_FONT_STYLE = {
  fontFamily: "var(--font-geist-sans)",
} as const;

const SAMPLE_VERSE =
  "Thy word is a lamp unto my feet, and a light unto my path.";

/**
 * Compares the established Geist treatment with a restrained game-display
 * treatment that uses Lilita One only for headings and short game labels.
 *
 * The component is an isolated ADMIN-only design preview. Inline font-family
 * overrides keep the comparison samples distinct after the application-wide
 * heading and shared-button migration. The samples do not change production
 * button variants or any player-facing route.
 */
export function TypographyBalancePreview(): React.ReactNode {
  return (
    <section
      id="typography-balance"
      className="scroll-mt-24 space-y-5 rounded-3xl border bg-card p-4 shadow-sm sm:p-6"
      aria-labelledby="typography-balance-title"
    >
      <div>
        <p className="text-xs font-black tracking-[0.18em] text-primary uppercase">
          Typography experiment
        </p>
        <h2
          id="typography-balance-title"
          className="mt-1 font-heading text-2xl font-black"
        >
          Geist and Lilita One
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Compare Geist with the adopted balance: Lilita One for titles,
          rewards, and short actions; Geist for reading and supporting text.
          The left sample preserves the previous typography for reference.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TypographySample
          treatment="Current typography"
          displayFont="geist"
        />
        <TypographySample
          treatment="Balanced preview"
          displayFont="lilita"
        />
      </div>
    </section>
  );
}

/** Renders identical game copy so the type treatment is the only variable. */
function TypographySample({
  treatment,
  displayFont,
}: {
  treatment: string;
  displayFont: "geist" | "lilita";
}): React.ReactNode {
  const displayStyle =
    displayFont === "lilita" ? DISPLAY_FONT_STYLE : READING_FONT_STYLE;

  return (
    <article className="space-y-5 rounded-2xl border bg-background p-4 sm:p-5">
      <p className="text-xs font-black tracking-[0.16em] text-muted-foreground uppercase">
        {treatment}
      </p>

      <div className="space-y-3">
        <p
          className="text-xs font-black tracking-[0.18em] text-primary uppercase"
          style={displayStyle}
        >
          Your journey
        </p>
        <h3
          className="text-3xl leading-tight font-black tracking-tight sm:text-4xl"
          style={displayStyle}
        >
          A Light for Your Path
        </h3>
        <p className="text-base leading-7 text-muted-foreground">
          Your next verse is ready. Learn at your pace and return whenever you
          need to practice.
        </p>
      </div>

      <blockquote className="rounded-2xl border bg-muted/50 p-4">
        <BookOpenIcon
          className="mb-2 size-5 text-primary"
          aria-hidden="true"
        />
        <p className="font-sans text-base leading-7">“{SAMPLE_VERSE}”</p>
        <cite className="mt-2 block text-sm not-italic text-muted-foreground">
          Psalm 119:105 · KJV
        </cite>
      </blockquote>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-card px-4 text-primary"
          style={displayStyle}
        >
          <FlameIcon className="size-4" aria-hidden="true" />
          <span>GLOW +150</span>
        </div>
        <div
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-muted px-4 text-sm font-bold"
          style={displayStyle}
        >
          <SparklesIcon className="size-4" aria-hidden="true" />
          <span>Day 1 complete</span>
        </div>
      </div>

      <Button
        type="button"
        className="min-h-12 w-full"
        style={displayStyle}
      >
        Continue journey
      </Button>
    </article>
  );
}
