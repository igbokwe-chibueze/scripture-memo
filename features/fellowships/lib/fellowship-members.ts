/** Local roster browsing only: no writes, identity lookup, or server-owned ranking changes. */
import type { FellowshipMemberRanking } from "../types/fellowship.types";

export const FELLOWSHIP_MEMBER_SORTS = [
  "LEADER_NAME",
  "NAME_ASC",
  "NAME_DESC",
  "JOINED_ASC",
  "JOINED_DESC",
  "RANK_ASC",
  "RANK_DESC",
] as const;
export type FellowshipMemberSort = (typeof FELLOWSHIP_MEMBER_SORTS)[number];

/**
 * Sum the full current roster, not search results or visible rows. These lifetime
 * totals include progress made before joining and never imply fellowship rewards.
 */
export function getFellowshipJourneyTotals(
  members: readonly FellowshipMemberRanking[],
): { lifetimeBeaconPoints: number; waypointsCompleted: number } {
  return members.reduce(
    (totals, member) => ({
      lifetimeBeaconPoints: totals.lifetimeBeaconPoints + member.lifetimeBeaconPoints,
      waypointsCompleted: totals.waypointsCompleted + member.waypointsCompleted,
    }),
    { lifetimeBeaconPoints: 0, waypointsCompleted: 0 },
  );
}

/** Case/accent-insensitive names make search usable across the shipped locales. */
function searchName(value: string, locale: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase(locale);
}

/**
 * Returns a new array so browsing cannot reorder the authorized source roster.
 * Server rank 1 is highest lifetime Beacon Points; join dates and names can be
 * sorted in either direction. Only the default mode pins the leader first.
 */
export function browseFellowshipMembers(
  members: readonly FellowshipMemberRanking[],
  options: { query: string; sort: FellowshipMemberSort; locale: string },
): FellowshipMemberRanking[] {
  const query = searchName(options.query.trim(), options.locale);
  const collator = new Intl.Collator(options.locale, { sensitivity: "base", numeric: true });
  const compareName = (left: FellowshipMemberRanking, right: FellowshipMemberRanking): number =>
    collator.compare(left.displayName, right.displayName) || left.rank - right.rank;

  return members.filter((member) => searchName(member.displayName, options.locale).includes(query))
    .sort((left, right) => {
      switch (options.sort) {
        case "LEADER_NAME":
          return Number(right.isLeader) - Number(left.isLeader) || compareName(left, right);
        case "NAME_ASC":
          return compareName(left, right);
        case "NAME_DESC":
          return compareName(right, left);
        case "JOINED_ASC":
          return left.joinedAt.getTime() - right.joinedAt.getTime() || compareName(left, right);
        case "JOINED_DESC":
          return right.joinedAt.getTime() - left.joinedAt.getTime() || compareName(left, right);
        case "RANK_ASC":
          return left.rank - right.rank;
        case "RANK_DESC":
          return right.rank - left.rank;
      }
    });
}
