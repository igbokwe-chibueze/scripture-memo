"use client";

/** Copy the existing permanent profile link; visiting it never automatically adds a friend. */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { LinkIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Clipboard-limited HTTP browsers retain a selectable manual-copy fallback. */
export function FriendsShareCard({
  publicId,
}: {
  publicId: string;
}): React.ReactNode {
  const t = useTranslations("PlayerSocial");
  const [fallback, setFallback] = useState("");
  async function copy(): Promise<void> {
    const url = `${window.location.origin}/profiles/${publicId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("copied"));
    } catch {
      setFallback(url);
      toast.error(t("copyManually"), { duration: Infinity });
    }
  }
  return (
    <section className="space-y-4 rounded-card border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <LinkIcon aria-hidden="true" className="size-9 shrink-0 text-primary" />
        <div>
          <h2 className="font-heading text-xl font-bold">
            {t("inviteFriend")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("shareYourProfile")}
          </p>
        </div>
      </div>
      <Button
        className="min-h-12 w-full whitespace-normal"
        onClick={() => void copy()}
      >
        <CopyIcon aria-hidden="true" />
        {t("copyProfileLink")}
      </Button>
      {fallback && (
        <Input
          className="min-h-11"
          value={fallback}
          readOnly
          aria-label={t("shareYourProfile")}
          onFocus={(event) => event.target.select()}
        />
      )}
    </section>
  );
}
