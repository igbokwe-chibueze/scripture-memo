import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookOpenCheckIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authRepository } from "@/features/auth/repositories/auth.repository";
import { TranslationSelectionForm } from "@/features/auth/components/translation-selection-form";
import { requireServerSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Choose your Bible translation | Scripture Memo",
  robots: { index: false, follow: false },
};

/** Protected one-time onboarding view for the preferred Bible translation. */
export async function TranslationSelectionView(): Promise<React.ReactNode> {
  const session = await requireServerSession();
  if (await authRepository.hasSelectedTranslation(session.user.id)) redirect("/game");

  return (
    <main className="flex min-h-svh items-center justify-center bg-linear-to-b from-primary/10 via-background to-amber-100/50 px-4 py-10 dark:to-amber-950/20">
      <Card className="w-full max-w-xl shadow-2xl shadow-primary/10">
        <CardHeader className="items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <BookOpenCheckIcon className="size-7" aria-hidden="true" />
          </span>
          <CardTitle className="text-2xl">Choose your Bible translation</CardTitle>
          <p className="text-sm text-muted-foreground">
            This will be your default throughout the journey. You can change it later in Settings.
          </p>
        </CardHeader>
        <CardContent><TranslationSelectionForm /></CardContent>
      </Card>
    </main>
  );
}
