"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { DownloadIcon, MailIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/shared/form-error";
import { LoadingButton } from "@/components/shared/loading-button";
import { requestPasswordResetAction } from "@/features/auth/actions/request-password-reset.action";
import {
  requestPasswordResetSchema,
  type RequestPasswordResetInput,
} from "@/features/auth/schemas/request-password-reset.schema";

type DownloadFile = { fileName: string; content: string };

/** Starts recovery and downloads the development reset message when available. */
export function RequestPasswordResetForm(): React.ReactNode {
  const t = useTranslations("Auth");
  const [isPending, startTransition] = useTransition();
  const [download, setDownload] = useState<DownloadFile>();
  const form = useForm<RequestPasswordResetInput>({
    resolver: zodResolver(requestPasswordResetSchema),
    defaultValues: { email: "" },
  });

  function downloadResetFile(file: DownloadFile): void {
    // WHY: The live URL stays in memory and is never placed in localStorage,
    // browser history, analytics, or an application-owned database.
    const blobUrl = URL.createObjectURL(
      new Blob([file.content], { type: "text/plain;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = file.fileName;
    anchor.click();
    URL.revokeObjectURL(blobUrl);
  }

  function submit(input: RequestPasswordResetInput): void {
    form.clearErrors("root");
    startTransition(async () => {
      const result = await requestPasswordResetAction(input);
      if (!result.success) {
        const emailError = result.fieldErrors?.email?.[0];
        if (emailError) form.setError("email", { message: emailError });
        form.setError("root", { message: result.message });
        toast.error(result.message, { duration: Infinity });
        return;
      }

      const lightDevDownload = result.data?.lightDevDownload;
      setDownload(lightDevDownload);
      if (lightDevDownload) downloadResetFile(lightDevDownload);
      toast.success(result.message);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(form.formState.errors.email)}>
          <FieldLabel htmlFor="recovery-email">{t("email")}</FieldLabel>
          <Input
            id="recovery-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-invalid={Boolean(form.formState.errors.email)}
            {...form.register("email")}
          />
          <FieldError>{form.formState.errors.email?.message}</FieldError>
        </Field>
        <FormError message={form.formState.errors.root?.message} />
        <LoadingButton
          type="submit"
          size="lg"
          className="w-full"
          isPending={isPending}
          pendingLabel={t("preparingReset")}
        >
          <MailIcon aria-hidden="true" />
          {t("prepareReset")}
        </LoadingButton>
        {download && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => downloadResetFile(download)}
          >
            <DownloadIcon aria-hidden="true" />
            {t("downloadResetAgain")}
          </Button>
        )}
      </FieldGroup>
    </form>
  );
}

