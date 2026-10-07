import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { NavigationButton } from "@/components/shared/navigation-button";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { EditFellowshipForm } from "@/features/fellowships/components/edit-fellowship-form";
import { FellowshipGovernancePanel } from "@/features/fellowships/components/fellowship-governance-panel";
import { FellowshipInviteSettings } from "@/features/fellowships/components/fellowship-invite-settings";
import { fellowshipRepository } from "@/features/fellowships/repositories/fellowship.repository";
import { getServerSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Manage Fellowship | Scripture Memo",
  robots: { index: false, follow: false },
};

/** Renders leader-only profile, invite, and governance settings. */
export async function EditFellowshipView({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactNode> {
  const session = await getServerSession();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const [fellowship, t] = await Promise.all([
    fellowshipRepository.getEditable(session.user.id, slug),
    getTranslations("Fellowships"),
  ]);
  if (!fellowship) notFound();

  return (
    <main className="min-h-dvh bg-linear-to-b from-violet-500/8 via-background to-amber-500/8 py-8">
      <ResponsiveContainer size="lg" className="space-y-7">
        <NavigationButton
          href={`/fellowships/${slug}`}
          pendingLabel={t("opening")}
          variant="outline"
          className="min-h-11 bg-card"
        >
          <ArrowLeftIcon aria-hidden="true" />
          {t("backToFellowship")}
        </NavigationButton>

        <header>
          <h1 className="font-heading text-3xl font-bold sm:text-4xl">
            {t("manageTitle")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t("manageDescription")}
          </p>
        </header>

        <section aria-labelledby="fellowship-edit-details-title" className="space-y-4">
          <h2
            id="fellowship-edit-details-title"
            className="font-heading text-2xl font-bold"
          >
            {t("editTitle")}
          </h2>
          <EditFellowshipForm fellowship={fellowship} />
        </section>

        <FellowshipInviteSettings
          fellowshipId={fellowship.id}
          initialInviteCode={fellowship.inviteCode}
        />

        <FellowshipGovernancePanel
          fellowshipId={fellowship.id}
          fellowshipName={fellowship.name}
          isLeader
          governance={fellowship.governance}
          mode="manage"
        />
      </ResponsiveContainer>
    </main>
  );
}
