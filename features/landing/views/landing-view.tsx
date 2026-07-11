import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpenIcon,
  CheckIcon,
  ChevronRightIcon,
  FlameIcon,
  Gamepad2Icon,
  MapIcon,
  SparklesIcon,
  SunMediumIcon,
} from "lucide-react";

import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { StatusBadge } from "@/components/shared/status-badge";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const siteUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Scripture Memo | Turn Bible Memory Into a Journey",
  description:
    "Memorize Bible verses through guided three-day challenges, five interactive game modes, meaningful progression, and devotional reflection.",
  keywords: [
    "Bible memorization",
    "Scripture memory game",
    "memorize Bible verses",
    "Christian learning game",
    "Bible study app",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Scripture Memo",
    title: "Scripture Memo | Turn Bible Memory Into a Journey",
    description:
      "Build lasting Scripture memory through a guided, game-like learning journey.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Scripture Memo | Turn Bible Memory Into a Journey",
    description:
      "Build lasting Scripture memory through guided challenges and interactive practice.",
  },
  robots: { index: true, follow: true },
};

const learningSteps = [
  { label: "Glimmer", detail: "Begin gently", tone: "bg-amber-300" },
  { label: "Glow", detail: "Recall with confidence", tone: "bg-orange-400" },
  { label: "Radiance", detail: "Remember independently", tone: "bg-violet-500" },
] as const;

const gameModes = ["Drag & Drop", "Puzzle", "Swap", "Cue", "Fill"] as const;

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Scripture Memo",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  description:
    "A guided scripture memorization game using sequential waypoints, progressive challenges, and interactive learning modes.",
};

/**
 * Renders the public, search-indexable introduction to Scripture Memo.
 *
 * The page explains the actual product loop without promising unfinished account
 * functionality. Its primary action leads to the noindex UI preview until Phase 5
 * supplies registration and login destinations. Native links retain navigation
 * semantics while reusing the shared visual variants for tactile game controls.
 */
export function LandingView(): React.ReactNode {
  return (
    <div className="min-h-dvh overflow-hidden bg-background text-foreground">
      {/*
        WHY: This JSON-LD object is static, project-owned data rather than user
        input. It helps search engines understand the product category without
        exposing private state or creating an injection path.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <header className="relative z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <ResponsiveContainer className="flex min-h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-heading text-lg font-bold tracking-tight focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <BookOpenIcon className="size-5" aria-hidden="true" />
            </span>
            Scripture Memo
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <Link
              href="/ui-foundation"
              className={buttonVariants({
                variant: "outline",
                className: "hidden min-h-11 rounded-2xl sm:inline-flex",
              })}
            >
              UI preview
            </Link>
          </div>
        </ResponsiveContainer>
      </header>

      <main>
        <section className="relative isolate py-14 sm:py-20 lg:py-24">
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_35%),radial-gradient(circle_at_85%_15%,oklch(0.75_0.16_75/0.16),transparent_32%),radial-gradient(circle_at_50%_85%,oklch(0.65_0.2_300/0.12),transparent_35%)]"
            aria-hidden="true"
          />

          <ResponsiveContainer>
            <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
              <div className="text-center lg:text-left">
                <StatusBadge
                  status="A Scripture journey built for memory"
                  tone="spiritual"
                  icon={<SparklesIcon aria-hidden="true" />}
                  className="mb-5"
                />
                <h1 className="text-balance font-heading text-4xl font-black tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                  Carry the Word.
                  <span className="block bg-linear-to-r from-amber-500 via-orange-500 to-violet-600 bg-clip-text text-transparent">
                    One journey at a time.
                  </span>
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg lg:mx-0">
                  Move through 220 waypoints, practice each verse across three days,
                  and strengthen your memory with five interactive challenges designed
                  to take you from first glimpse to confident recall.
                </p>

                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                  <Link
                    href="/ui-foundation"
                    className={buttonVariants({
                      size: "lg",
                      className:
                        "min-h-12 rounded-2xl px-6 text-base shadow-lg shadow-primary/20",
                    })}
                  >
                    Preview the experience
                    <ChevronRightIcon aria-hidden="true" />
                  </Link>
                  <a
                    href="#how-it-works"
                    className={buttonVariants({
                      variant: "outline",
                      size: "lg",
                      className: "min-h-12 rounded-2xl px-6 text-base",
                    })}
                  >
                    See how it works
                  </a>
                </div>

                <p className="mt-4 text-xs text-muted-foreground">
                  Registration and saved journeys arrive with the authentication phase.
                </p>
              </div>

              <div className="relative mx-auto w-full max-w-md" aria-label="Journey preview">
                <div className="absolute -inset-5 -z-10 rounded-[2.5rem] bg-linear-to-br from-amber-400/20 via-primary/10 to-violet-500/20 blur-2xl" />
                <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-card/90 p-5 shadow-2xl ring-1 ring-foreground/10 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Your journey
                      </p>
                      <p className="mt-1 font-heading text-xl font-bold">The First Light</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-xl bg-amber-500/10 px-3 py-2 text-sm font-bold text-amber-700 dark:text-amber-300">
                      <FlameIcon className="size-4 fill-current" aria-hidden="true" />
                      7
                    </div>
                  </div>

                  <div className="relative mt-8 space-y-7 px-3 pb-3">
                    <div className="absolute bottom-8 left-[2.15rem] top-5 w-1 rounded-full bg-linear-to-b from-amber-300 via-orange-400 to-muted" />
                    {[1, 2, 3, 4].map((waypoint) => {
                      const active = waypoint <= 2;

                      return (
                        <div key={waypoint} className="relative flex items-center gap-4">
                          <div
                            className={cn(
                              "relative z-10 grid size-14 shrink-0 place-items-center rounded-2xl border-4 border-card font-heading text-lg font-black shadow-md",
                              active
                                ? "bg-linear-to-br from-amber-300 to-orange-500 text-zinc-950"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {active ? waypoint : <MapIcon className="size-5" aria-hidden="true" />}
                          </div>
                          <div className="min-w-0 flex-1 rounded-2xl border border-border/70 bg-background/70 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate font-semibold">
                                {waypoint === 1 ? "Psalm 119:105" : `Waypoint ${waypoint}`}
                              </p>
                              {waypoint === 1 && <StatusBadge status="Learn" tone="success" />}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {waypoint === 1
                                ? "3 flames earned"
                                : active
                                  ? "Ready for your next challenge"
                                  : "Continue the journey to unlock"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </ResponsiveContainer>
        </section>

        <section id="how-it-works" className="border-y border-border/60 bg-muted/30 py-16 sm:py-20">
          <ResponsiveContainer>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
                Three days. Deeper memory.
              </p>
              <h2 className="mt-3 text-balance font-heading text-3xl font-black tracking-tight sm:text-4xl">
                From a glimmer to lasting radiance
              </h2>
              <p className="mt-4 text-pretty leading-7 text-muted-foreground">
                Every waypoint builds difficulty gradually, giving your memory time to
                strengthen before you move forward.
              </p>
            </div>

            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {learningSteps.map((step, index) => (
                <li
                  key={step.label}
                  className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-sm"
                >
                  <div className={cn("mb-5 grid size-12 place-items-center rounded-2xl text-zinc-950", step.tone)}>
                    <SunMediumIcon className="size-6" aria-hidden="true" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Day {index + 1}
                  </p>
                  <h3 className="mt-1 font-heading text-2xl font-bold">{step.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.detail}</p>
                </li>
              ))}
            </ol>
          </ResponsiveContainer>
        </section>

        <section className="py-16 sm:py-20">
          <ResponsiveContainer>
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Gamepad2Icon className="size-7" aria-hidden="true" />
                </div>
                <h2 className="mt-5 text-balance font-heading text-3xl font-black tracking-tight sm:text-4xl">
                  Practice that feels like play
                </h2>
                <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
                  Each day moves through five focused modes in a deliberate order, so
                  recognition becomes recall without losing the joy of progress.
                </p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {gameModes.map((mode, index) => (
                  <li
                    key={mode}
                    className="flex min-h-16 items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 font-heading text-sm font-black text-primary">
                      {index + 1}
                    </span>
                    <span className="font-semibold">{mode}</span>
                    <CheckIcon className="ml-auto size-4 text-emerald-500" aria-hidden="true" />
                  </li>
                ))}
              </ul>
            </div>
          </ResponsiveContainer>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <ResponsiveContainer className="flex flex-col items-center justify-between gap-3 text-center text-sm text-muted-foreground sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} Scripture Memo. Built for lasting memory.</p>
          <Link href="/ui-foundation" className="font-medium text-foreground underline-offset-4 hover:underline">
            View UI foundation
          </Link>
        </ResponsiveContainer>
      </footer>
    </div>
  );
}
