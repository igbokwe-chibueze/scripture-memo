import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { AuthCard } from "@/features/auth/components/auth-card";
import { RegisterForm } from "@/features/auth/components/register-form";
import { getSafePostLoginPath } from "@/features/auth/lib/get-safe-post-login-path";

export const metadata: Metadata = {
  title: "Create account | Scripture Memo",
  description: "Create your Scripture Memo account and begin the journey.",
  robots: { index: false, follow: false },
};

/** Public registration view that never renders for an authenticated session. */
export async function RegisterView({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }): Promise<React.ReactNode> {
  const next = (await searchParams).next;
  const nextPath = getSafePostLoginPath(typeof next === "string" ? next : undefined);
  if (await getServerSession()) redirect(nextPath);
  return (
    <AuthCard
      title="Begin your journey"
      description="Build a steady rhythm of learning, recall, and mastery."
      alternatePrompt="Already have an account?"
      alternateLabel="Log in"
      alternateHref={`/login?next=${encodeURIComponent(nextPath)}`}
    >
      <RegisterForm nextPath={nextPath} />
    </AuthCard>
  );
}
