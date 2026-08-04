import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeftIcon } from "lucide-react";
import { NavigationButton } from "@/components/shared/navigation-button";
import { FellowshipDetail } from "@/features/fellowships/components/fellowship-detail";
import { fellowshipRepository } from "@/features/fellowships/repositories/fellowship.repository";
import { getServerSession } from "@/lib/auth/session";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
export const metadata: Metadata = { title: "Fellowship | Scripture Memo", robots: { index: false, follow: false } };
export async function FellowshipDetailView({ params }: { params: Promise<{ slug: string }> }): Promise<React.ReactNode> { const session = await getServerSession(); if (!session?.user) redirect("/login"); const { slug } = await params; const [data, t] = await Promise.all([fellowshipRepository.getDetail(session.user.id, slug), getTranslations("Fellowships")]); if (!data) notFound(); return <main className="min-h-dvh bg-linear-to-b from-violet-500/8 via-background to-amber-500/8 py-8"><ResponsiveContainer size="lg"><NavigationButton href="/fellowships" pendingLabel={t("opening")} variant="outline" className="mb-6 min-h-11 bg-card"><ArrowLeftIcon />{t("back")}</NavigationButton><FellowshipDetail fellowship={data} /></ResponsiveContainer></main>; }
