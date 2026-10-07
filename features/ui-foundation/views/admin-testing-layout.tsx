import type { ReactNode } from "react";

import { getAdminSession } from "@/features/auth/lib/get-admin-session";

/** Enforces administrator authorization for every current and future test page. */
export async function AdminTestingLayout({
  children,
}: Readonly<{ children: ReactNode }>): Promise<ReactNode> {
  await getAdminSession();
  return children;
}
