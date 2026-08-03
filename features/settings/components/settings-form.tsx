"use client";

import { useMemo, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { AccessibilityIcon, Volume2Icon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FormError } from "@/components/shared/form-error";
import { LoadingButton } from "@/components/shared/loading-button";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { updateUserSettingsAction } from "@/features/settings/actions/update-user-settings.action";
import { COUNTRY_OPTIONS } from "@/features/settings/data/country-options";
import { updateUserSettingsSchema, type UpdateUserSettingsInput } from "@/features/settings/schemas/update-user-settings.schema";

export type SettingsFormProps = { initialValues: UpdateUserSettingsInput };

const timeZoneOptions = ["UTC", ...Intl.supportedValuesOf("timeZone")];

/** Editable account preferences with localized labels and immediate visual sync. */
export function SettingsForm({ initialValues }: SettingsFormProps): React.ReactNode {
  const t = useTranslations("Settings");
  const locale = useLocale();
  const router = useRouter();
  const { setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const form = useForm<UpdateUserSettingsInput>({
    resolver: zodResolver(updateUserSettingsSchema),
    defaultValues: initialValues,
  });
  const countryOptions = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: "region" });
    return [
      { value: "", label: t("notSelected") },
      ...COUNTRY_OPTIONS.map((country) => ({
        value: country.code,
        label: names.of(country.code) ?? country.name,
      })).sort((left, right) => left.label.localeCompare(right.label, locale)),
    ];
  }, [locale, t]);

  function submit(input: UpdateUserSettingsInput): void {
    form.clearErrors("root");
    startTransition(async () => {
      const result = await updateUserSettingsAction(input);
      if (!result.success) {
        Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
          if (field in form.getValues()) {
            form.setError(field as keyof UpdateUserSettingsInput, { message: messages[0] });
          }
        });
        form.setError("root", { message: result.message });
        toast.error(result.message, { duration: Infinity });
        return;
      }

      setTheme(input.theme);
      document.documentElement.classList.toggle("reduce-motion", input.reducedMotion);
      document.documentElement.lang = input.locale;
      form.reset(input);
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{t("profile")}</CardTitle></CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.displayName)}>
              <FieldLabel htmlFor="display-name">{t("displayName")}</FieldLabel>
              <Input id="display-name" autoComplete="name" aria-invalid={Boolean(form.formState.errors.displayName)} {...form.register("displayName")} />
              <FieldDescription>{t("displayNameDescription")}</FieldDescription>
              <FieldError>{form.formState.errors.displayName?.message}</FieldError>
            </Field>

            <Controller control={form.control} name="countryCode" render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>{t("country")}</FieldLabel>
                <SearchableSelect value={field.value} options={countryOptions} label={t("country")} placeholder={t("selectCountry")} searchPlaceholder={t("searchCountries")} emptyMessage={t("noCountry")} disabled={isPending} invalid={fieldState.invalid} onValueChange={field.onChange} />
                <FieldDescription>{t("countryDescription")}</FieldDescription>
                <FieldError>{fieldState.error?.message}</FieldError>
              </Field>
            )} />
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("scriptureExperience")}</CardTitle></CardHeader>
        <CardContent>
          <FieldGroup>
            <Controller control={form.control} name="locale" render={({ field }) => (
              <Field>
                <FieldLabel>{t("interfaceLanguage")}</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="min-h-11 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="en">{t("english")}</SelectItem><SelectItem value="es">{t("spanish")}</SelectItem></SelectContent>
                </Select>
                <FieldDescription>{t("interfaceLanguageDescription")}</FieldDescription>
              </Field>
            )} />

            <Controller control={form.control} name="preferredTranslation" render={({ field }) => (
              <Field>
                <FieldLabel>{t("preferredBibleTranslation")}</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="min-h-11 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="NIV">New International Version (NIV)</SelectItem><SelectItem value="ESV">English Standard Version (ESV)</SelectItem><SelectItem value="KJV">King James Version (KJV)</SelectItem></SelectContent>
                </Select>
              </Field>
            )} />

            <Controller control={form.control} name="theme" render={({ field }) => (
              <Field>
                <FieldLabel>{t("theme")}</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="min-h-11 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="light">{t("light")}</SelectItem><SelectItem value="dark">{t("dark")}</SelectItem><SelectItem value="system">{t("system")}</SelectItem></SelectContent>
                </Select>
              </Field>
            )} />

            <Field data-invalid={Boolean(form.formState.errors.timeZone)}>
              <FieldLabel htmlFor="calendar-timezone">{t("calendarTimezone")}</FieldLabel>
              <Input id="calendar-timezone" list="calendar-timezone-options" autoComplete="off" disabled={isPending} aria-invalid={Boolean(form.formState.errors.timeZone)} {...form.register("timeZone")} />
              <datalist id="calendar-timezone-options">{timeZoneOptions.map((timeZone) => <option key={timeZone} value={timeZone}>{timeZone.replaceAll("_", " ")}</option>)}</datalist>
              <FieldDescription>{t("timezoneDescription")}</FieldDescription>
              <FieldError>{form.formState.errors.timeZone?.message}</FieldError>
            </Field>

            <Controller control={form.control} name="audioEnabled" render={({ field }) => (
              <Field orientation="horizontal" className="min-h-16 items-center rounded-xl border p-4">
                <Volume2Icon className="size-5 text-primary" aria-hidden="true" />
                <div className="flex-1"><FieldLabel htmlFor="audio-enabled">{t("audioEffects")}</FieldLabel><FieldDescription>{t("audioDescription")}</FieldDescription></div>
                <Switch id="audio-enabled" checked={field.value} onCheckedChange={field.onChange} />
              </Field>
            )} />

            <Controller control={form.control} name="reducedMotion" render={({ field }) => (
              <Field orientation="horizontal" className="min-h-16 items-center rounded-xl border p-4">
                <AccessibilityIcon className="size-5 text-primary" aria-hidden="true" />
                <div className="flex-1"><FieldLabel htmlFor="reduced-motion">{t("reducedMotion")}</FieldLabel><FieldDescription>{t("motionDescription")}</FieldDescription></div>
                <Switch id="reduced-motion" checked={field.value} onCheckedChange={field.onChange} />
              </Field>
            )} />
          </FieldGroup>
        </CardContent>
      </Card>

      <FormError message={form.formState.errors.root?.message} />
      <LoadingButton type="submit" size="lg" className="w-full sm:w-auto" isPending={isPending} pendingLabel={t("savingSettings")} disabled={!form.formState.isDirty}>
        {t("saveSettings")}
      </LoadingButton>
    </form>
  );
}
