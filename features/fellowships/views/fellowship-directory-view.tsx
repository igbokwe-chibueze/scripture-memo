import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FellowshipDirectory } from "@/features/fellowships/components/fellowship-directory";
import { fellowshipRepository } from "@/features/fellowships/repositories/fellowship.repository";
import { getServerSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";

export const metadata: Metadata = { title: "Fellowships | Scripture Memo", description: "Join a Scripture Memo fellowship.", robots: { index: false, follow: false } };
export async function FellowshipDirectoryView({ searchParams }: { searchParams: Promise<{ q?: string; invite?: string }> }): Promise<React.ReactNode> { const session = await getServerSession(); if (!session?.user) redirect("/login"); const { q = "", invite = "" } = await searchParams; const initialInviteCode = invite.trim().slice(0, 64); const [data, t] = await Promise.all([fellowshipRepository.getDirectory(session.user.id, q), getTranslations("Fellowships")]); return <main className="min-h-dvh bg-linear-to-b from-violet-500/8 via-background to-amber-500/8 py-8"><ResponsiveContainer size="lg"><PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} /><div className="mt-8"><FellowshipDirectory data={data} initialSearch={q} initialInviteCode={initialInviteCode} /></div></ResponsiveContainer></main>; }
