import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminSession } from "@/features/auth/lib/get-admin-session";

export const metadata: Metadata = {
  title: "Admin testing | Scripture Memo",
  robots: { index: false, follow: false },
};

/** Keeps the former internal preview URL as a protected redirect for old links. */
export async function UiFoundationRedirectView(): Promise<never> {
  await getAdminSession();
  redirect("/admin/testing");
}
