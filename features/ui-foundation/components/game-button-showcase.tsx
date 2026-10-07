"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronLeftIcon,
  HeartIcon,
  PlayIcon,
  RotateCcwIcon,
  ShieldAlertIcon,
  SparklesIcon,
} from "lucide-react";

import { LoadingButton } from "@/components/shared/loading-button";
import { NavigationButton } from "@/components/shared/navigation-button";
import { Button } from "@/components/ui/button";

const GAME_BUTTON_VARIANTS = [
  {
    name: "Primary",
    variant: "default",
    description: "Main action: begin, continue, or confirm.",
  },
  {
    name: "Secondary",
    variant: "secondary",
    description: "Supporting action with a quieter filled surface.",
  },
  {
    name: "Outline",
    variant: "outline",
    description: "Alternative actions and compact selectors.",
  },
  {
    name: "Ghost",
    variant: "ghost",
    description: "Low emphasis actions inside a card or toolbar.",
  },
  {
    name: "Destructive",
    variant: "destructive",
    description: "Actions that remove or cancel something important.",
  },
  {
    name: "Text link",
    variant: "link",
    description: "A quieter inline action that still has button behavior.",
  },
] as const satisfies Array<{
  name: string;
  variant: NonNullable<ComponentProps<typeof Button>["variant"]>;
  description: string;
}>;

/**
 * Demonstrates the actual shared game button system without introducing local
 * visual overrides or touching player data. The examples cover the three button
 * behavior components, every approved appearance variant, icon actions, pending
 * and disabled states, plus representative size options.
 */
export function GameButtonShowcase(): React.ReactNode {
  const [isSaving, setIsSaving] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    },
    [],
  );

  const simulateSave = (): void => {
    if (isSaving) return;
    setIsSaving(true);
    timerRef.current = window.setTimeout(() => {
      setIsSaving(false);
      timerRef.current = null;
    }, 1_100);
  };

  return (
    <section
      id="button-showcase"
      className="scroll-mt-24 space-y-5 rounded-3xl border bg-card p-4 shadow-sm sm:p-6"
      aria-labelledby="game-button-showcase-title"
    >
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">
          Shared game controls
        </p>
        <h2
          id="game-button-showcase-title"
          className="mt-1 font-heading text-2xl font-bold"
        >
          Button types and styles
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          These examples use the production Button, LoadingButton, and
          NavigationButton components with the shared game-button treatment.
          The samples perform no game or account changes.
        </p>
      </div>

      <div className="space-y-3" aria-labelledby="button-appearance-title">
        <h3 id="button-appearance-title" className="font-heading text-lg font-bold">
          Appearance variants
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {GAME_BUTTON_VARIANTS.map((item) => (
            <article
              key={item.variant}
              className="flex min-w-0 flex-col gap-3 rounded-2xl border bg-background p-3"
            >
              <div>
                <h4 className="font-bold">{item.name}</h4>
                <p className="mt-1 min-h-10 text-sm leading-5 text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <Button
                type="button"
                variant={item.variant}
                className="min-h-11 w-full"
              >
                {item.variant === "default" && <PlayIcon aria-hidden="true" />}
                {item.variant === "secondary" && <SparklesIcon aria-hidden="true" />}
                {item.variant === "destructive" && <ShieldAlertIcon aria-hidden="true" />}
                Try {item.name.toLowerCase()}
              </Button>
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section
          className="space-y-3 rounded-2xl border bg-background p-4"
          aria-labelledby="button-behavior-title"
        >
          <div>
            <h3 id="button-behavior-title" className="font-heading text-lg font-bold">
              Behavior types
            </h3>
            <p className="text-sm text-muted-foreground">
              Immediate action, asynchronous feedback, and route navigation.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" className="min-h-11 w-full">
              <HeartIcon aria-hidden="true" />
              Immediate action
            </Button>
            <LoadingButton
              type="button"
              isPending={isSaving}
              pendingLabel="Saving sample"
              className="w-full"
              onClick={simulateSave}
            >
              <CheckIcon aria-hidden="true" />
              Try pending state
            </LoadingButton>
            <NavigationButton
              href="/admin/testing/features#feature-test-previews"
              pendingLabel="Opening feature checks"
              variant="outline"
              className="min-h-11 w-full sm:col-span-2"
            >
              <ArrowRightIcon aria-hidden="true" />
              Navigate with feedback
            </NavigationButton>
          </div>
        </section>

        <section
          className="space-y-3 rounded-2xl border bg-background p-4"
          aria-labelledby="button-size-title"
        >
          <div>
            <h3 id="button-size-title" className="font-heading text-lg font-bold">
              Sizes and states
            </h3>
            <p className="text-sm text-muted-foreground">
              Examples retain a 44px minimum touch target for text and icon actions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="xs" className="min-h-11">
              Compact
            </Button>
            <Button type="button" size="sm" className="min-h-11">
              Small
            </Button>
            <Button type="button" size="default" className="min-h-11">
              Standard
            </Button>
            <Button type="button" size="lg" className="min-h-11">
              Large
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="icon-xs"
              variant="outline"
              className="min-h-11 min-w-11"
              aria-label="Tiny icon example"
            >
              <SparklesIcon aria-hidden="true" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="min-h-11 min-w-11"
              aria-label="Small icon example"
            >
              <HeartIcon aria-hidden="true" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="min-h-11 min-w-11"
              aria-label="Previous example"
            >
              <ChevronLeftIcon aria-hidden="true" />
            </Button>
            <Button
              type="button"
              size="icon-lg"
              variant="outline"
              className="min-h-11 min-w-11"
              aria-label="Reset example"
            >
              <RotateCcwIcon aria-hidden="true" />
            </Button>
            <Button type="button" disabled className="min-h-11">
              Disabled action
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled
              className="min-h-11"
            >
              Disabled alternative
            </Button>
          </div>
        </section>
      </div>
    </section>
  );
}
