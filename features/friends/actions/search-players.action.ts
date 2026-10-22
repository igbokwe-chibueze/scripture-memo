"use server";

/** Explicit bounded discovery for the Add friends dialog, never a per-keystroke query. */
import { getTranslations } from "next-intl/server";
import { getServerSession } from "@/lib/auth/session";
import type { ActionResult } from "@/types/api";
import type { FriendsPageData } from "@/types/player-social.types";
import { friendsPageSchema } from "../schemas/friend.schema";
import { friendRepository } from "../repositories/friend.repository";

/** Authenticated identity is the only actor; directory results never include private fields. */
export async function searchPlayersAction(
  input: unknown,
): Promise<ActionResult<Pick<FriendsPageData, "players" | "hasNext">>> {
  const parsed = friendsPageSchema
    .pick({ q: true, page: true })
    .strict()
    .safeParse(input);
  const t = await getTranslations("PlayerSocial");
  if (!parsed.success || parsed.data.q.replace(/^@/, "").length < 2)
    return { success: false, message: t("searchHelp") };
  const session = await getServerSession();
  if (!session?.user)
    return { success: false, message: t("errors.unavailable") };
  try {
    const data = await friendRepository.getPage(session.user.id, {
      ...parsed.data,
      tab: "search",
    });
    if (!data) return { success: false, message: t("errors.unavailable") };
    return {
      success: true,
      message: t("searchComplete"),
      data: { players: data.players, hasNext: data.hasNext },
    };
  } catch {
    return {
      success: false,
      message: t("errors.failed"),
      errorCode: "SOC-001",
    };
  }
}
