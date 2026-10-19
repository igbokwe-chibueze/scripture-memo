/** Stable self-profile destination; no duplicate profile implementation. */
import { redirect, notFound } from "next/navigation";
import { requireServerSession } from "@/lib/auth/session";
import { friendRepository } from "@/features/friends/repositories/friend.repository";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My profile | Scripture Memo",
  robots: { index: false, follow: false },
};

/** Resolve the permanent UUID after auth; never initialize data on read. */
export async function OwnProfileView(): Promise<never> {
  const session = await requireServerSession();
  const publicId = await friendRepository.getOwnPublicId(session.user.id);
  if (!publicId) notFound();
  redirect(`/profiles/${publicId}`);
}
