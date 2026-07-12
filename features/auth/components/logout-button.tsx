"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-button";
import { logoutAction } from "@/features/auth/actions/logout.action";

/** Invalidates the current session and returns the player to the public home. */
export function LogoutButton(): React.ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <LoadingButton
      variant="outline"
      isPending={isPending}
      pendingLabel="Logging out"
      onClick={() => {
        startTransition(async () => {
          const result = await logoutAction();
          if (!result.success) {
            toast.error(result.message, { duration: Infinity });
            return;
          }
          toast.success(result.message);
          router.push("/");
          router.refresh();
        });
      }}
    >
      Log out
    </LoadingButton>
  );
}
