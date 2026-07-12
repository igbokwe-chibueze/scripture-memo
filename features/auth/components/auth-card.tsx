import Link from "next/link";
import { BookOpenTextIcon, SparklesIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type AuthCardProps = {
  title: string;
  description: string;
  alternatePrompt: string;
  alternateLabel: string;
  alternateHref: "/login" | "/register";
  children: React.ReactNode;
};

/** Mobile-first devotional frame shared by login and registration forms. */
export function AuthCard({
  title,
  description,
  alternatePrompt,
  alternateLabel,
  alternateHref,
  children,
}: AuthCardProps): React.ReactNode {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-linear-to-b from-amber-50 via-background to-violet-50 px-4 py-10 dark:from-amber-950/30 dark:to-violet-950/30">
      <div className="absolute top-10 left-1/2 -translate-x-1/2 text-primary/20" aria-hidden="true">
        <SparklesIcon className="size-40" />
      </div>
      <Card className="relative w-full max-w-md border-primary/15 bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur">
        <CardHeader className="items-center text-center">
          <Link
            href="/"
            className="mb-2 flex min-h-11 items-center gap-2 rounded-full px-3 font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BookOpenTextIcon className="size-5" aria-hidden="true" />
            Scripture Memo
          </Link>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent>
          {children}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {alternatePrompt}{" "}
            <Link
              href={alternateHref}
              className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline"
            >
              {alternateLabel}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
