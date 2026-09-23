"use client";

import { useRouter } from "next/navigation";
import { FellowshipDirectoryContent } from "./fellowship-directory-content";
import { joinFellowshipAction } from "../actions/join-fellowship.action";
import { joinFellowshipByInviteAction } from "../actions/join-fellowship-by-invite.action";
import { requestFellowshipJoinAction } from "../actions/request-fellowship-join.action";
import { cancelFellowshipJoinRequestAction } from "../actions/cancel-fellowship-join-request.action";
import type { FellowshipDirectoryData } from "../types/fellowship.types";

/** Binds authenticated actions and real navigation; no preview option is exposed. */
export function FellowshipDirectory(props: {
  data: FellowshipDirectoryData;
  initialSearch: string;
  initialInviteCode: string;
}): React.ReactNode {
  const router = useRouter();
  return (
    <FellowshipDirectoryContent
      {...props}
      transport={{
        join: joinFellowshipAction,
        joinInvite: joinFellowshipByInviteAction,
        request: requestFellowshipJoinAction,
        cancel: cancelFellowshipJoinRequestAction,
        refresh: () => router.refresh(),
        navigate: (href) => router.push(href),
        linkHref: (href) => href,
      }}
    />
  );
}
