import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArrowLeftIcon } from "lucide-react";
import { NavigationButton } from "@/components/shared/navigation-button";
import { CreateFellowshipForm } from "@/features/fellowships/components/create-fellowship-form";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
export const metadata: Metadata = { title: "Create Fellowship | Scripture Memo", robots: { index: false, follow: false } };
export async function CreateFellowshipView(): Promise<React.ReactNode> { const t = await getTranslations("Fellowships"); return <main className="min-h-dvh bg-linear-to-b from-violet-500/8 via-background to-amber-500/8 py-8"><ResponsiveContainer size="sm"><NavigationButton href="/fellowships" pendingLabel={t("opening")} variant="outline" className="mb-6 min-h-11 bg-card"><ArrowLeftIcon />{t("back")}</NavigationButton><h1 className="font-heading text-4xl font-black">{t("createTitle")}</h1><p className="mt-2 text-muted-foreground">{t("createDescription")}</p><div className="mt-7"><CreateFellowshipForm /></div></ResponsiveContainer></main>; }
