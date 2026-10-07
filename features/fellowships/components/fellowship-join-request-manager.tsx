"use client";

import { useRouter } from "next/navigation";
import { resolveFellowshipJoinRequestAction } from "../actions/resolve-fellowship-join-request.action";
import { FellowshipJoinRequestContent } from "./fellowship-join-request-content";
import type { FellowshipJoinRequestItem } from "../types/fellowship.types";

/** Production leader queue retains server authorization and normal refreshes. */
export function FellowshipJoinRequestManager({ requests }: {
  requests: FellowshipJoinRequestItem[];
}): React.ReactNode {
  const router = useRouter();
  return (
    <FellowshipJoinRequestContent
      requests={requests}
      transport={{
        resolve: resolveFellowshipJoinRequestAction,
        refresh: () => router.refresh(),
      }}
    />
  );
}
