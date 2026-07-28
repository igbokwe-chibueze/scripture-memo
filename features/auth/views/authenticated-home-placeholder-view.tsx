import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FlameIcon, MapIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { authRepository } from "@/features/auth/repositories/auth.repository";
import { getStreakDisplay } from "@/features/progression/lib/streak-utils";
import { userRepository } from "@/features/users/repositories/user.repository";
import { requireServerSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your journey | Scripture Memo",
  robots: { index: false, follow: false },
};

/**
 * Temporary authenticated destination used until the roadmap's Game Home phase.
 * It proves session protection and logout without implementing progression early.
 */
export async function AuthenticatedHomePlaceholderView(): Promise<React.ReactNode> {
  const session = await requireServerSession();
  if (!(await authRepository.hasSelectedTranslation(session.user.id))) {
    redirect("/select-translation");
  }
  const profile = await userRepository.getProfileSummary(session.user.id);

  return (
    <main className="flex min-h-svh items-center justify-center bg-linear-to-b from-amber-100/70 via-background to-primary/10 px-4 text-center dark:from-amber-950/30">
      <div className="max-w-md space-y-6">
        <span className="mx-auto flex size-20 items-center justify-center rounded-3xl bg-amber-500 text-white shadow-xl shadow-amber-500/25">
          <FlameIcon className="size-10" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-3xl font-bold">Welcome, {session.user.name}</h1>
          <p className="mt-2 text-muted-foreground">
            Your account is ready. The full Game Home arrives in its roadmap phase.
          </p>
        </div>
        <div
          className="mx-auto flex min-h-11 w-fit items-center rounded-full border border-orange-400/35 bg-orange-100 px-5 font-bold text-orange-800 shadow-sm dark:bg-orange-400/10 dark:text-orange-200"
          aria-label={`Current streak: ${profile?.currentStreak ?? 0} days`}
        >
          {getStreakDisplay(profile?.currentStreak ?? 0)}
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/game/map"
            className={cn(buttonVariants({ size: "lg" }), "min-h-11 gap-2 px-4")}
          >
            <MapIcon aria-hidden="true" />
            Open game map
          </Link>
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
