import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FlameIcon } from "lucide-react";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { authRepository } from "@/features/auth/repositories/auth.repository";
import { requireServerSession } from "@/lib/auth/session";

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
        <LogoutButton />
      </div>
    </main>
  );
}
