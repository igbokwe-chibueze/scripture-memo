"use client";

/** One dialog edits identity using a single atomic save and preserves unsaved input on errors. */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { PencilIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/shared/loading-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { showActionError } from "@/lib/errors/show-action-error";
import { COUNTRY_OPTIONS } from "@/features/settings/data/country-options";
import type { PlayerProfileData } from "../types/player-profile.types";
import { editProfileAction } from "../actions/edit-profile.action";
import { editProfileSchema } from "../schemas/edit-profile.schema";
import { PlayerAvatar } from "./player-avatar";

/** The avatar overlay and header button open this same editor, not separate settings routes. */
export function ProfileEditor({
  profile,
  iconOnly = false,
}: {
  profile: PlayerProfileData;
  iconOnly?: boolean;
}): React.ReactNode {
  const t = useTranslations("PlayerSocial");
  const settings = useTranslations("Settings");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username ?? "");
  const [country, setCountry] = useState(profile.countryCode ?? "");
  const [avatar, setAvatar] = useState(profile.avatarKey);
  const [error, setError] = useState("");
  const countries = new Intl.DisplayNames(locale, { type: "region" });

  /** Reset drafts on opening; pending saves cannot accidentally dismiss the editor. */
  function changeOpen(value: boolean): void {
    if (pending) return;
    if (value) {
      setName(profile.displayName);
      setUsername(profile.username ?? "");
      setCountry(profile.countryCode ?? "");
      setAvatar(profile.avatarKey);
      setError("");
    }
    setOpen(value);
  }

  return (
    <>
      <Button
        variant="secondary"
        className={iconOnly ? "size-11 rounded-full p-0" : "min-h-11"}
        aria-label={t("editProfile")}
        onClick={() => changeOpen(true)}
      >
        <PencilIcon aria-hidden="true" />
        {!iconOnly && t("editProfile")}
      </Button>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader className="pr-14">
            <DialogTitle>{t("editProfile")}</DialogTitle>
            <DialogDescription>{t("editDescription")}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const parsed = editProfileSchema.safeParse({
                displayName: name,
                countryCode: country,
                avatarKey: avatar,
                ...(username.trim() ? { username } : {}),
              });
              if (!parsed.success) {
                setError(t("profileCheck"));
                return;
              }
              setError("");
              startTransition(async () => {
                try {
                  const result = await editProfileAction(parsed.data);
                  if (!result.success) {
                    showActionError(result);
                    return;
                  }
                  toast.success(result.message);
                  setOpen(false);
                  router.refresh();
                } catch {
                  // Retain the draft when transport fails so retrying loses no input.
                  toast.error(t("errors.failed"), { duration: Infinity });
                }
              });
            }}
          >
            <label className="block space-y-2">
              <span>{settings("displayName")}</span>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={50}
                className="min-h-11"
                disabled={pending}
                required
              />
            </label>
            <label className="block space-y-2">
              <span>{t("usernameTitle")}</span>
              <Input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                maxLength={25}
                className="min-h-11"
                disabled={pending || profile.nextUsernameChangeAt !== null}
                autoCapitalize="none"
                spellCheck={false}
              />
              <span className="block text-sm text-muted-foreground">
                {t("usernameHelp")}
              </span>
              {profile.nextUsernameChangeAt && (
                <span className="block text-sm text-muted-foreground">
                  {t("usernameNextChange", {
                    date: new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                    }).format(new Date(profile.nextUsernameChangeAt)),
                  })}
                </span>
              )}
            </label>
            <label className="block space-y-2">
              <span>{settings("country")}</span>
              <select
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                disabled={pending}
                className="min-h-11 w-full rounded-control border border-border bg-background p-2"
              >
                <option value="">{settings("selectCountry")}</option>
                {COUNTRY_OPTIONS.map((entry) => (
                  <option key={entry.code} value={entry.code}>
                    {countries.of(entry.code) ?? entry.name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset disabled={pending}>
              <legend className="mb-3">{settings("chooseAvatar")}</legend>
              <div className="grid grid-cols-3 gap-3">
                {profile.privateDetails?.availableAvatars.map((key) => (
                  <Button
                    key={key}
                    type="button"
                    variant="secondary"
                    aria-pressed={avatar === key}
                    aria-label={settings(`animals.${key}`)}
                    onClick={() => setAvatar(key)}
                    className={`h-auto min-h-24 p-2 ${avatar === key ? "ring-2 ring-primary" : ""}`}
                  >
                    <PlayerAvatar
                      avatarKey={key}
                      frameKey="default"
                      displayName={settings(`animals.${key}`)}
                      size="md"
                    />
                  </Button>
                ))}
              </div>
            </fieldset>
            {error && (
              <p role="alert" className="text-error-text">
                {error}
              </p>
            )}
            <LoadingButton
              type="submit"
              isPending={pending}
              pendingLabel={t("saving")}
              className="min-h-11 w-full"
            >
              {t("saveProfile")}
            </LoadingButton>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
