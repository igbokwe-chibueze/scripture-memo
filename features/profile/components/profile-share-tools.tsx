"use client";

/** Sharing is a user gesture; links never implicitly send or accept a request. */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Share2Icon, CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

/** Native share plus a selectable link for HTTP or clipboard-limited browsers. */
export function ProfileShareTools({ publicId }: { publicId: string }): React.ReactNode {
  const t = useTranslations("PlayerSocial");
  const [link, setLink] = useState("");

  /** One stable profile URL serves existing players and resumable registration. */
  async function share(): Promise<void> {
    const url = `${window.location.origin}/profiles/${publicId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: t("profileTitle"), text: t("shareText"), url });
        return;
      }
      setLink(url);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setLink(url);
    }
  }

  /** Keep the selectable URL available when browser clipboard access is denied. */
  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyManually"), { duration: Infinity });
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          onClick={() => void share()}
          className="min-h-11"
        >
          <Share2Icon aria-hidden="true" />
          {t("shareProfile")}
        </Button>
      </div>
      <Dialog
        open={Boolean(link)}
        onOpenChange={(open) => !open && setLink("")}
      >
        <DialogContent>
          {/* Reserve room for the shared close control in wrapped translations. */}
          <DialogHeader className="pr-14">
            <DialogTitle>{t("shareProfile")}</DialogTitle>
            <DialogDescription>{t("shareHelp")}</DialogDescription>
          </DialogHeader>
          <Input
            value={link}
            readOnly
            aria-label={t("profileLink")}
            onFocus={(event) => event.target.select()}
          />
          <Button
            onClick={() => void copyLink()}
            className="min-h-11"
          >
            <CopyIcon aria-hidden="true" />
            {t("copyLink")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
