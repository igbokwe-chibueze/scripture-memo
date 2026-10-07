import type { ActionResult } from "@/types/api";
import type { FellowshipMutationData } from "./fellowship.types";

/** Client-only callbacks; production wrappers bind authenticated Server Actions. */
export type FellowshipDirectoryTransport = {
  join: (input: { fellowshipId: string }) => Promise<ActionResult<FellowshipMutationData>>;
  request: (input: { fellowshipId: string }) => Promise<ActionResult<FellowshipMutationData>>;
  cancel: (input: { requestId: string }) => Promise<ActionResult>;
  joinInvite: (input: { inviteCode: string }) => Promise<ActionResult<FellowshipMutationData>>;
  refresh: () => void;
  navigate: (href: string) => void;
  linkHref: (href: string) => string;
};

/** Leader decisions share their real UI handling without sharing persistence. */
export type FellowshipDecisionTransport = {
  resolve: (input: {
    requestId: string;
    decision: "APPROVE" | "REJECT";
  }) => Promise<ActionResult>;
  refresh: () => void;
};
