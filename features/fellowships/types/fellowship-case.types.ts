import type { FellowshipGovernanceCaseKind } from "@/lib/generated/prisma/enums";

/** Safe, display-ready summary for one row in the Super Admin case register. */
export type FellowshipGovernanceCaseListItem = {
  id: string;
  caseNumber: string;
  kind: FellowshipGovernanceCaseKind;
  currentStatus: string;
  openedAt: Date;
  fellowshipName: string;
  openedByName: string;
};

/** One immutable event displayed in a case's chronological history. */
export type FellowshipGovernanceCaseEvent = {
  id: string;
  action: string;
  createdAt: Date;
  actorName: string;
  summary: string | null;
};

/** Detail returned to the Super Admin case screen without private raw metadata. */
export type FellowshipGovernanceCaseDetail = FellowshipGovernanceCaseListItem & {
  reason: string | null;
  participants: string[];
  events: FellowshipGovernanceCaseEvent[];
};

/** A bounded case register page. */
export type FellowshipGovernanceCasePage = {
  total: number;
  pageSize: number;
  items: FellowshipGovernanceCaseListItem[];
};
