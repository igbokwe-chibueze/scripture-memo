import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { KeyRoundIcon } from "lucide-react";
import { NavigationButton } from "@/components/shared/navigation-button";
import { joinByInviteSchema } from "@/features/fellowships/schemas/fellowship.schema";
import { FellowshipInviteLanding } from "@/features/fellowships/components/fellowship-invite-landing";
import { fellowshipRepository } from "@/features/fellowships/repositories/fellowship.repository";
import { getServerSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Fellowship invitation | Scripture Memo", description: "Respond to a Scripture Memo Fellowship invitation.", robots: { index: false, follow: false } };

/** Resolves a public invitation without exposing its underlying secret or private member data. */
export async function FellowshipInviteView({ params }: { params: Promise<{ inviteCode: string }> }): Promise<React.ReactNode> {
  const { inviteCode: rawInviteCode } = await params;
  const parsed = joinByInviteSchema.safeParse({ inviteCode: rawInviteCode });
  const [session, t] = await Promise.all([getServerSession(), getTranslations("Fellowships")]);
  const fellowship = parsed.success ? await fellowshipRepository.getInvitePreview(parsed.data.inviteCode, session?.user.id) : null;

  if (!fellowship || !parsed.success) {
    return (
      <main className="grid min-h-svh place-items-center bg-background px-4 text-foreground">
        <section className="w-full max-w-md rounded-card border border-border bg-card p-8 text-center shadow-sm">
          <span className="mx-auto grid size-16 place-items-center rounded-control bg-muted text-muted-foreground">
            <KeyRoundIcon className="size-8" aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-heading text-3xl font-bold">
            {t("inviteExpiredTitle")}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {t("inviteExpiredDescription")}
          </p>
          <NavigationButton
            href="/fellowships"
            pendingLabel={t("opening")}
            className="mt-6 min-h-12 w-full"
          >
            {t("findFellowships")}
          </NavigationButton>
        </section>
      </main>
    );
  }

  return <FellowshipInviteLanding inviteCode={parsed.data.inviteCode} fellowship={fellowship} isAuthenticated={Boolean(session?.user)} />;
}
