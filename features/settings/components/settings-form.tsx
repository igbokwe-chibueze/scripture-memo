"use client";

import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Volume2Icon, AccessibilityIcon } from "lucide-react";
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
import {
  updateUserSettingsSchema,
  type UpdateUserSettingsInput,
} from "@/features/settings/schemas/update-user-settings.schema";

export type SettingsFormProps = { initialValues: UpdateUserSettingsInput };

const countryOptions = [
  { value: "", label: "Not selected" },
  ...COUNTRY_OPTIONS.map((country) => ({ value: country.code, label: country.name })),
];

/** Editable profile and preference form with immediate local theme application. */
export function SettingsForm({ initialValues }: SettingsFormProps): React.ReactNode {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const form = useForm<UpdateUserSettingsInput>({
    resolver: zodResolver(updateUserSettingsSchema),
    defaultValues: initialValues,
  });

  function submit(input: UpdateUserSettingsInput): void {
    form.clearErrors("root");
    startTransition(async () => {
      const result = await updateUserSettingsAction(input);
      if (!result.success) {
        Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
          if (field in form.getValues()) {
            form.setError(field as keyof UpdateUserSettingsInput, {
              message: messages[0],
            });
          }
        });
        form.setError("root", { message: result.message });
        toast.error(result.message, { duration: Infinity });
        return;
      }

      setTheme(input.theme);
      document.documentElement.classList.toggle("reduce-motion", input.reducedMotion);
      form.reset(input);
      toast.success("Settings saved.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.displayName)}>
              <FieldLabel htmlFor="display-name">Display name</FieldLabel>
              <Input
                id="display-name"
                autoComplete="name"
                aria-invalid={Boolean(form.formState.errors.displayName)}
                {...form.register("displayName")}
              />
              <FieldDescription>Shown on leaderboards and fellowship pages.</FieldDescription>
              <FieldError>{form.formState.errors.displayName?.message}</FieldError>
            </Field>

            <Controller
              control={form.control}
              name="countryCode"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Country</FieldLabel>
                  <SearchableSelect
                    value={field.value}
                    options={countryOptions}
                    label="Country"
                    placeholder="Select your country"
                    searchPlaceholder="Search countries…"
                    emptyMessage="No country matches your search."
                    disabled={isPending}
                    invalid={fieldState.invalid}
                    onValueChange={field.onChange}
                  />
                  <FieldDescription>Used only for country leaderboard filtering.</FieldDescription>
                  <FieldError>{fieldState.error?.message}</FieldError>
                </Field>
              )}
            />
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Scripture experience</CardTitle></CardHeader>
        <CardContent>
          <FieldGroup>
            <Controller
              control={form.control}
              name="preferredTranslation"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Preferred Bible translation</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="min-h-11 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NIV">New International Version (NIV)</SelectItem>
                      <SelectItem value="ESV">English Standard Version (ESV)</SelectItem>
                      <SelectItem value="KJV">King James Version (KJV)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="theme"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Theme</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="min-h-11 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">Use system setting</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="audioEnabled"
              render={({ field }) => (
                <Field orientation="horizontal" className="min-h-16 items-center rounded-xl border p-4">
                  <Volume2Icon className="size-5 text-primary" aria-hidden="true" />
                  <div className="flex-1">
                    <FieldLabel htmlFor="audio-enabled">Audio effects</FieldLabel>
                    <FieldDescription>Play feedback sounds during practice.</FieldDescription>
                  </div>
                  <Switch id="audio-enabled" checked={field.value} onCheckedChange={field.onChange} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="reducedMotion"
              render={({ field }) => (
                <Field orientation="horizontal" className="min-h-16 items-center rounded-xl border p-4">
                  <AccessibilityIcon className="size-5 text-primary" aria-hidden="true" />
                  <div className="flex-1">
                    <FieldLabel htmlFor="reduced-motion">Reduced motion</FieldLabel>
                    <FieldDescription>Minimize non-essential interface animation.</FieldDescription>
                  </div>
                  <Switch id="reduced-motion" checked={field.value} onCheckedChange={field.onChange} />
                </Field>
              )}
            />
          </FieldGroup>
        </CardContent>
      </Card>

      <FormError message={form.formState.errors.root?.message} />
      <LoadingButton
        type="submit"
        size="lg"
        className="w-full sm:w-auto"
        isPending={isPending}
        pendingLabel="Saving settings"
        disabled={!form.formState.isDirty}
      >
        Save settings
      </LoadingButton>
    </form>
  );
}
