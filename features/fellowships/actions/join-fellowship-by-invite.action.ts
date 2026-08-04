"use server";
import { completeFellowshipJoin } from "./fellowship-action-helpers";
import { fellowshipRepository } from "@/features/fellowships/repositories/fellowship.repository";
import { joinByInviteSchema } from "@/features/fellowships/schemas/fellowship.schema";
import type { FellowshipMutationData } from "@/features/fellowships/types/fellowship.types";
import { getServerSession } from "@/lib/auth/session";
import type { ActionResult } from "@/types/api";
/** Exchanges a constrained private invite code for a server-owned membership. */
export async function joinFellowshipByInviteAction(input: unknown): Promise<ActionResult<FellowshipMutationData>> { const parsed = joinByInviteSchema.safeParse(input); if (!parsed.success) return { success: false, message: "Enter a valid invite code." }; const session = await getServerSession(); if (!session?.user) return { success: false, message: "Authentication required." }; return completeFellowshipJoin(session.user.id, () => fellowshipRepository.joinByInvite(session.user.id, parsed.data.inviteCode)); }
