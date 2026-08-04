import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AuthCard } from "@/features/auth/components/auth-card";
import { RequestPasswordResetForm } from "@/features/auth/components/request-password-reset-form";
import { getServerSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Forgot password | Scripture Memo",
  description: "Recover access to your Scripture Memo account.",
  robots: { index: false, follow: false },
};

/** Public recovery entry point backed by Better Auth password reset. */
export async function ForgotPasswordView(): Promise<React.ReactNode> {
  if (await getServerSession()) redirect("/game");
  const t = await getTranslations("Auth");

  return (
    <AuthCard
      title={t("forgotPasswordTitle")}
      description={t("forgotPasswordDescription")}
      alternatePrompt={t("rememberPassword")}
      alternateLabel={t("backToLogin")}
      alternateHref="/login"
    >
      <RequestPasswordResetForm />
    </AuthCard>
  );
}

