import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";
import { getSafePostLoginPath } from "@/features/auth/lib/get-safe-post-login-path";

export const metadata: Metadata = {
  title: "Log in | Scripture Memo",
  description: "Log in to continue your Scripture memorization journey.",
  robots: { index: false, follow: false },
};

export type LoginViewProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

/** Public login view that preserves a protected destination for authentication. */
export async function LoginView({ searchParams }: LoginViewProps): Promise<React.ReactNode> {
  const next = (await searchParams).next;
  const nextPath = typeof next === "string" ? next : undefined;
  const safeNextPath = getSafePostLoginPath(nextPath);
  if (await getServerSession()) redirect(safeNextPath);
  return (
    <AuthCard
      title="Welcome back"
      description="Continue building Scripture into lasting memory."
      alternatePrompt="New to Scripture Memo?"
      alternateLabel="Create an account"
      alternateHref={`/register?next=${encodeURIComponent(safeNextPath)}`}
    >
      <LoginForm nextPath={safeNextPath} />
    </AuthCard>
  );
}
