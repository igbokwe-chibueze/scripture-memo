import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangleIcon, RotateCcwIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Reset password | Scripture Memo",
  description: "Choose a new password for your Scripture Memo account.",
  robots: { index: false, follow: false },
};

export type ResetPasswordViewProps = {
  searchParams: Promise<{
    token?: string | string[];
    error?: string | string[];
  }>;
};

/** Accepts only the token Better Auth places on its validated callback URL. */
export async function ResetPasswordView({
  searchParams,
}: ResetPasswordViewProps): Promise<React.ReactNode> {
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : "";
  const hasCallbackError = typeof query.error === "string";
  const t = await getTranslations("Auth");

  return (
    <AuthCard
      title={token && !hasCallbackError ? t("resetPasswordTitle") : t("resetLinkInvalidTitle")}
      description={token && !hasCallbackError
        ? t("resetPasswordDescription")
        : t("resetLinkInvalidDescription")}
      alternatePrompt={t("rememberPassword")}
      alternateLabel={t("backToLogin")}
      alternateHref="/login"
    >
      {token && !hasCallbackError ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="space-y-5 text-center">
          <AlertTriangleIcon
            className="mx-auto size-14 text-amber-500"
            aria-hidden="true"
          />
          <Link
            href="/forgot-password"
            className={cn(buttonVariants({ size: "lg" }), "w-full")}
          >
            <RotateCcwIcon aria-hidden="true" />
            {t("requestNewReset")}
          </Link>
        </div>
      )}
    </AuthCard>
  );
}

