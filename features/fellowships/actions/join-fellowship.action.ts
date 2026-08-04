"use server";
import { completeFellowshipJoin } from "./fellowship-action-helpers";
import { fellowshipRepository } from "@/features/fellowships/repositories/fellowship.repository";
import { joinFellowshipSchema } from "@/features/fellowships/schemas/fellowship.schema";
import type { FellowshipMutationData } from "@/features/fellowships/types/fellowship.types";
import { getServerSession } from "@/lib/auth/session";
import type { ActionResult } from "@/types/api";
/** Joins an authenticated learner to a server-confirmed public fellowship. */
export async function joinFellowshipAction(input: unknown): Promise<ActionResult<FellowshipMutationData>> { const parsed = joinFellowshipSchema.safeParse(input); if (!parsed.success) return { success: false, message: "Select a valid fellowship." }; const session = await getServerSession(); if (!session?.user) return { success: false, message: "Authentication required." }; return completeFellowshipJoin(session.user.id, () => fellowshipRepository.joinPublic(session.user.id, parsed.data.fellowshipId)); }
