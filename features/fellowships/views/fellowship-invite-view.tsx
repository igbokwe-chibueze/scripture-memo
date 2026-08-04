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

  if (!fellowship || !parsed.success) return <main className="dark grid min-h-svh place-items-center bg-linear-to-b from-violet-950 via-slate-950 to-amber-950 px-4 text-white"><section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 text-center shadow-2xl"><span className="mx-auto grid size-16 place-items-center rounded-2xl bg-white/8 text-amber-300"><KeyRoundIcon className="size-8" /></span><h1 className="mt-5 font-heading text-3xl font-black">{t("inviteExpiredTitle")}</h1><p className="mt-3 text-slate-300">{t("inviteExpiredDescription")}</p><NavigationButton href="/fellowships" pendingLabel={t("opening")} className="mt-6 min-h-12 w-full">{t("findFellowships")}</NavigationButton></section></main>;

  return <FellowshipInviteLanding inviteCode={parsed.data.inviteCode} fellowship={fellowship} isAuthenticated={Boolean(session?.user)} />;
}
