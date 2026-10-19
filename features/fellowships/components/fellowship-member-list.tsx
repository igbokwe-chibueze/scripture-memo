"use client";

/** Searchable member navigation using the complete, already-authorized roster. */
import { useId, useMemo, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { ChevronRightIcon, SearchIcon, UsersRoundIcon } from "lucide-react";
import { PlayerAvatar } from "@/features/profile/components/player-avatar";
import { CountryFlag } from "@/components/shared/country-flag";
import { GameArtwork } from "@/components/shared/game-artwork";
import { NavigationButton } from "@/components/shared/navigation-button";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  browseFellowshipMembers,
  FELLOWSHIP_MEMBER_SORTS,
  type FellowshipMemberSort,
} from "../lib/fellowship-members";
import type { FellowshipMemberRanking } from "../types/fellowship.types";
import styles from "./fellowship-members.module.css";

/**
 * A whole-row profile link retains shared navigation feedback. Prefetch is off:
 * merely viewing many rows must not fan out authenticated profile requests.
 * A missing legacy profile remains informational instead of leaking an auth ID.
 */
function FellowshipMemberRow({
  member,
  position,
}: {
  member: FellowshipMemberRanking;
  /** One-based position in the displayed list, independent of lifetime rank. */
  position: number;
}): React.ReactNode {
  const t = useTranslations("Fellowships");
  const format = useFormatter();
  const points = format.number(member.lifetimeBeaconPoints);
  const content = (
    <>
      <span className={styles.position}>#{format.number(position)}</span>
      <PlayerAvatar
        avatarKey={member.avatarKey}
        frameKey={member.avatarFrameKey}
        displayName={member.displayName}
        size="sm"
        className={styles.avatar}
      />
      <span className={styles.identity}>
        <strong className={styles.name}>
          {member.displayName}
        </strong>
        <CountryFlag
          countryCode={member.countryCode}
          label={member.countryCode || t("globalMember")}
          className={styles.flag}
        />
        {member.isCurrentUser && (
          <span className={styles.badge}>{t("memberList.you")}</span>
        )}
        {member.isLeader && (
          <span className={styles.badge}>{t("leader")}</span>
        )}
      </span>
      <span className={styles.waypoints}>
        <GameArtwork name="map" className="size-5" sizes="20px" />
        <span>{t("memberList.waypoints", { count: member.waypointsCompleted })}</span>
      </span>
      <span
        className={styles.points}
        aria-label={t("memberList.lifetimeValue", { points })}
        title={t("memberList.lifetimeValue", { points })}
      >
        <GameArtwork name="beacon" className="size-6" sizes="24px" />
        <strong>
          {format.number(member.lifetimeBeaconPoints, {
            notation: member.lifetimeBeaconPoints >= 100000 ? "compact" : "standard",
            maximumFractionDigits: 1,
          })}
        </strong>
      </span>
      {member.profilePublicId && (
        <ChevronRightIcon className={styles.arrow} aria-hidden="true" />
      )}
    </>
  );

  return member.profilePublicId ? (
    <NavigationButton
      href={`/profiles/${encodeURIComponent(member.profilePublicId)}`}
      pendingLabel={t("opening")}
      prefetch={false}
      variant="ghost"
      className={styles.row}
      data-self={member.isCurrentUser}
    >
      {content}
    </NavigationButton>
  ) : (
    <div className={styles.row} data-self={member.isCurrentUser}>
      {content}
    </div>
  );
}

/** Local search and sorting never fetch, mutate, truncate or paginate the roster. */
export function FellowshipMemberList({
  members,
}: {
  members: FellowshipMemberRanking[];
}): React.ReactNode {
  const t = useTranslations("Fellowships");
  const locale = useLocale();
  const sortId = useId();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<FellowshipMemberSort>("LEADER_NAME");
  const visible = useMemo(
    () => browseFellowshipMembers(members, { query, sort, locale }),
    [members, query, sort, locale],
  );

  return (
    <section className={styles.members} aria-label={t("membersTab")}>
      <div className={styles.controls}>
        <label className={styles.search}>
          <SearchIcon aria-hidden="true" className="size-5 shrink-0" />
          <span className="sr-only">{t("memberList.search")}</span>
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={t("memberList.search")}
            className={styles.searchInput}
          />
        </label>
        <div className={styles.sort}>
          <label htmlFor={sortId}>{t("memberList.sortBy")}</label>
          <select
            id={sortId}
            value={sort}
            onChange={(event) => {
              const value = event.currentTarget.value;
              const selected = FELLOWSHIP_MEMBER_SORTS.find((mode) => mode === value);
              if (selected) setSort(selected);
            }}
          >
            {FELLOWSHIP_MEMBER_SORTS.map((mode) => (
              <option key={mode} value={mode}>
                {t(`memberList.sorts.${mode}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.summary}>
        <p role="status" aria-live="polite">
          {query.trim()
            ? t("memberList.results", { shown: visible.length, total: members.length })
            : t("members", { count: members.length })}
        </p>
        <span className={styles.lifetimeLabel}>{t("memberList.lifetimePoints")}</span>
      </div>

      {visible.length > 0 ? (
        <div className={styles.list}>
          <div className={styles.columnHeader} aria-hidden="true">
            <span>#</span>
            <span>{t("member")}</span>
            <span>{t("completedWaypointsMetric")}</span>
            <span>{t("memberList.lifetimePoints")}</span>
          </div>
          {visible.map((member, index) => (
            <FellowshipMemberRow
              key={member.profilePublicId ?? `${member.rank}-${member.displayName}`}
              member={member}
              position={index + 1}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<UsersRoundIcon aria-hidden="true" />}
          title={t(query.trim() ? "memberList.noResults" : "overview.noMembers")}
          description={t(query.trim() ? "memberList.searchHelp" : "memberList.emptyHelp")}
          action={query.trim() ? (
            <Button variant="secondary" className="min-h-11" onClick={() => setQuery("")}>
              {t("memberList.clearSearch")}
            </Button>
          ) : undefined}
        />
      )}
    </section>
  );
}
