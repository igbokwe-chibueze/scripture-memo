import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Log in | Scripture Memo",
  description: "Log in to continue your Scripture memorization journey.",
  robots: { index: false, follow: false },
};

/** Public login view that redirects an existing session to the game home. */
export async function LoginView(): Promise<React.ReactNode> {
  if (await getServerSession()) redirect("/game");
  return (
    <AuthCard
      title="Welcome back"
      description="Continue building Scripture into lasting memory."
      alternatePrompt="New to Scripture Memo?"
      alternateLabel="Create an account"
      alternateHref="/register"
    >
      <LoginForm />
    </AuthCard>
  );
}
