"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { EllipsisVerticalIcon, FlaskConicalIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { showActionError } from "@/lib/errors/show-action-error";
import { cn } from "@/lib/utils";
import { startAdminVaultReplayAction } from "@/features/vault/actions/start-admin-vault-replay.action";

type VaultAdminTestingMenuProps = {
  verse: { verseId: string; reference: string } | null;
};

/** Keeps the no-progress replay fixture inside the administrator testing menu. */
export function VaultAdminTestingMenu({
  verse,
}: VaultAdminTestingMenuProps): React.ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function startReplay(): void {
    if (!verse) return;

    startTransition(async () => {
      const result = await startAdminVaultReplayAction({ verseId: verse.verseId });
      if (!result.success) {
        showActionError(result);
        return;
      }
      if (!result.data) {
        toast.error("The Vault test replay could not start.", { duration: Infinity });
        return;
      }

      toast.success(result.message, { duration: 4_000 });
      router.push(`/game/sessions/${result.data.sessionId}`);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Admin testing"
        disabled={isPending}
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "size-11 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/15",
        )}
      >
        {isPending ? (
          <LoaderCircleIcon className="size-5 animate-spin" aria-hidden="true" />
        ) : (
          <EllipsisVerticalIcon className="size-5" aria-hidden="true" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-xl p-2">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5 font-black">
            Admin testing
          </DropdownMenuLabel>
          <DropdownMenuItem
            disabled={!verse || isPending}
            className="min-h-11 cursor-pointer gap-3 rounded-lg px-3 py-2 font-bold"
            onClick={startReplay}
          >
            <FlaskConicalIcon aria-hidden="true" />
            {verse ? `Test Vault replay · ${verse.reference}` : "No completed verse available"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
