import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { NavigationButton } from "@/components/shared/navigation-button";
import { EditFellowshipForm } from "@/features/fellowships/components/edit-fellowship-form";
import { FellowshipInviteSettings } from "@/features/fellowships/components/fellowship-invite-settings";
import { fellowshipRepository } from "@/features/fellowships/repositories/fellowship.repository";
import { getServerSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Edit fellowship | Scripture Memo", robots: { index: false, follow: false } };

/** Server-authorized fellowship editor; non-leaders receive no settings data. */
export async function EditFellowshipView({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactNode> {
  const session = await getServerSession();
  if (!session?.user) redirect("/login");
  const { slug } = await params;
  const [fellowship, t] = await Promise.all([fellowshipRepository.getEditable(session.user.id, slug), getTranslations("Fellowships")]);
  if (!fellowship) notFound();
  return <main className="min-h-dvh bg-linear-to-b from-violet-500/8 via-background to-amber-500/8 py-8"><ResponsiveContainer size="sm"><NavigationButton href={`/fellowships/${slug}`} pendingLabel={t("opening")} variant="outline" className="mb-6 min-h-11 bg-card"><ArrowLeftIcon />{t("backToFellowship")}</NavigationButton><h1 className="font-heading text-4xl font-black">{t("editTitle")}</h1><p className="mt-2 text-muted-foreground">{t("editDescription")}</p><div className="mt-7"><EditFellowshipForm fellowship={fellowship} /><FellowshipInviteSettings fellowshipId={fellowship.id} /></div></ResponsiveContainer></main>;
}
