"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AwardIcon,
  BarChart3Icon,
  EditIcon,
  InfoIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/shared/loading-button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { showActionError } from "@/lib/errors/show-action-error";
import { UserEmailAutocomplete } from "@/features/admin/components/user-email-autocomplete";
import { awardBadgeAction } from "@/features/badges/actions/award-badge.action";
import { deleteBadgeAction } from "@/features/badges/actions/delete-badge.action";
import { saveBadgeAction } from "@/features/badges/actions/save-badge.action";
import { setBadgeActiveAction } from "@/features/badges/actions/set-badge-active.action";
import {
  BADGE_CRITERIA_LABELS,
  BADGE_REWARD_BY_RARITY,
  isBadgeCriterionAvailable,
} from "@/features/badges/constants/badge-criteria";
import type {
  AdminBadgeItem,
  BadgeCriteriaKey,
} from "@/features/badges/types/badge.types";
import type { BadgeCategory, BadgeRarity } from "@/lib/generated/prisma/enums";
import { saveBadgeSchema } from "@/features/badges/schemas/save-badge.schema";

type BadgeDraft = {
  id?: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  criteriaKey: BadgeCriteriaKey;
  targetValue: number;
  isHidden: boolean;
  isActive: boolean;
};

const EMPTY_DRAFT: BadgeDraft = {
  name: "",
  description: "",
  icon: "",
  category: "LEARNING",
  rarity: "COMMON",
  criteriaKey: "LEARN_STAGE_COMPLETED",
  targetValue: 1,
  isHidden: false,
  isActive: false,
};

/** Adds keyboard- and touch-accessible context to compact administration fields. */
function FieldHint({
  label,
  explanation,
}: {
  label: string;
  explanation: string;
}): React.ReactNode {
  return (
    <span className="flex min-h-11 items-center justify-between gap-2">
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label={`About ${label}`}
            />
          }
        >
          <InfoIcon className="size-3.5" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-64 text-pretty">
          {explanation}
        </TooltipContent>
      </Tooltip>
    </span>
  );
}

/** Provides controlled catalogue editing, statistics, and audited manual grants. */
export function BadgeAdminManager({
  badges,
  canAward,
}: {
  badges: AdminBadgeItem[];
  canAward: boolean;
}): React.ReactNode {
  const [awardBadgeId, setAwardBadgeId] = useState(badges[0]?.id ?? "");
  const [userEmail, setUserEmail] = useState("");
  const [draft, setDraft] = useState<BadgeDraft | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteCandidate, setDeleteCandidate] =
    useState<AdminBadgeItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const visibleBadges = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    if (!normalizedQuery) return badges;
    return badges.filter((badge) =>
      [
        badge.name,
        badge.description,
        badge.category,
        badge.rarity,
        BADGE_CRITERIA_LABELS[badge.criteriaKey],
      ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery)),
    );
  }, [badges, searchQuery]);

  const award = (): void => {
    startTransition(async () => {
      const result = await awardBadgeAction({
        badgeId: awardBadgeId,
        userEmail,
      });
      if (!result.success) return showActionError(result);
      toast.success(result.message, { duration: 4_000 });
      setUserEmail("");
    });
  };

  const save = (): void => {
    if (!draft) return;
    const validated = saveBadgeSchema.safeParse(draft);
    if (!validated.success) {
      setFormErrors(validated.error.flatten().fieldErrors);
      toast.error("Review the highlighted badge details.", {
        duration: Infinity,
      });
      return;
    }
    startTransition(async () => {
      const result = await saveBadgeAction(draft);
      if (!result.success) {
        setFormErrors(result.fieldErrors ?? {});
        return showActionError(result);
      }
      toast.success(result.message, { duration: 4_000 });
      setFormErrors({});
      setDraft(null);
    });
  };

  const toggle = (badge: AdminBadgeItem): void => {
    startTransition(async () => {
      const result = await setBadgeActiveAction({
        badgeId: badge.id,
        isActive: !badge.isActive,
      });
      if (!result.success) return showActionError(result);
      toast.success(result.message, { duration: 4_000 });
    });
  };

  const deleteBadge = (): void => {
    if (!deleteCandidate) return;
    startTransition(async () => {
      const result = await deleteBadgeAction({
        badgeId: deleteCandidate.id,
      });
      if (!result.success) return showActionError(result);
      toast.success(result.message, { duration: 4_000 });
      setDeleteCandidate(null);
    });
  };

  const edit = (badge: AdminBadgeItem): void => {
    setFormErrors({});
    setDraft({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      icon: badge.icon ?? "",
      category: badge.category,
      rarity: badge.rarity,
      criteriaKey: badge.criteriaKey,
      targetValue: badge.targetValue,
      isHidden: badge.isHidden,
      isActive: badge.isActive,
    });
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-xl font-black">Badge definitions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              New badges use trusted server metrics and rarity-owned rewards.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setFormErrors({});
              setDraft({ ...EMPTY_DRAFT });
            }}
          >
            <PlusIcon aria-hidden="true" />
            Create badge
          </Button>
        </div>

        {draft && (
          <div className="mt-5 grid gap-4 rounded-2xl border bg-muted/30 p-4">
            {Object.keys(formErrors).length > 0 && (
              <div
                className="rounded-xl border border-red-400/40 bg-red-50 p-4 text-sm text-red-900 dark:bg-red-950/30 dark:text-red-100"
                role="alert"
              >
                <p className="font-black">Please correct these fields:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {Object.entries(formErrors).flatMap(([field, messages]) =>
                    messages.map((message) => (
                      <li key={`${field}:${message}`}>
                        <span className="font-bold capitalize">
                          {field.replace(/([A-Z])/g, " $1")}:
                        </span>{" "}
                        {message}
                      </li>
                    )),
                  )}
                </ul>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-[6rem_1fr]">
              <label className="grid gap-1 text-sm font-bold">
                Icon
                <input
                  className="min-h-11 rounded-xl border border-input bg-background px-3 aria-invalid:border-red-500"
                  aria-invalid={Boolean(formErrors.icon)}
                  value={draft.icon}
                  maxLength={16}
                  placeholder="🏅"
                  onChange={(event) =>
                    setDraft({ ...draft, icon: event.currentTarget.value })
                  }
                />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                Name
                <input
                  className="min-h-11 rounded-xl border border-input bg-background px-3 aria-invalid:border-red-500"
                  aria-invalid={Boolean(formErrors.name)}
                  value={draft.name}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.currentTarget.value })
                  }
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm font-bold">
              Description
              <textarea
                className="min-h-24 rounded-xl border border-input bg-background p-3 aria-invalid:border-red-500"
                aria-invalid={Boolean(formErrors.description)}
                value={draft.description}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.currentTarget.value })
                }
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="grid gap-1 text-sm font-bold">
                <FieldHint
                  label="Category"
                  explanation="Groups related achievements in the player's collection. It does not change how progress is calculated."
                />
                <select
                  className="min-h-11 rounded-xl border border-input bg-background px-3"
                  value={draft.category}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      category: event.currentTarget.value as BadgeCategory,
                    })
                  }
                >
                  {["LEARNING", "STREAK", "MASTERY", "INDEPENDENCE", "SPEED", "EXPLORATION"].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-bold">
                <FieldHint
                  label="Rarity"
                  explanation="Controls the celebration style and server-owned Glow reward: Common 50 through Legendary 500."
                />
                <select
                  className="min-h-11 rounded-xl border border-input bg-background px-3"
                  value={draft.rarity}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      rarity: event.currentTarget.value as BadgeRarity,
                    })
                  }
                >
                  {["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-bold">
                <FieldHint
                  label="Target"
                  explanation="The criterion value required to unlock the badge. For example, Streak Days with a target of 7 unlocks at a seven-day streak."
                />
                <input
                  type="number"
                  min={1}
                  max={1_000_000}
                  className="min-h-11 rounded-xl border border-input bg-background px-3 aria-invalid:border-red-500"
                  aria-invalid={Boolean(formErrors.targetValue)}
                  value={draft.targetValue}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      targetValue: Number(event.currentTarget.value),
                    })
                  }
                />
              </label>
              <div className="rounded-xl border border-amber-300/50 bg-amber-50 p-3 text-sm font-bold text-amber-900 dark:bg-amber-950/25 dark:text-amber-100">
                <FieldHint
                  label="Reward"
                  explanation="Glow Points awarded once when the badge unlocks. The amount is automatically determined by rarity and cannot be entered manually."
                />
                <p className="mt-1 text-lg font-black">
                  {BADGE_REWARD_BY_RARITY[draft.rarity]} Glow
                </p>
              </div>
            </div>
            <label className="grid gap-1 text-sm font-bold">
              <FieldHint
                label="Trusted criterion"
                explanation="The server-owned measurement used for progress. Future-feature criteria stay paused until their trusted gameplay event exists."
              />
              <select
                className="min-h-11 rounded-xl border border-input bg-background px-3"
                value={draft.criteriaKey}
                onChange={(event) => {
                  const criteriaKey =
                    event.currentTarget.value as BadgeCriteriaKey;
                  setDraft({
                    ...draft,
                    criteriaKey,
                    isActive: isBadgeCriterionAvailable(criteriaKey)
                      ? draft.isActive
                      : false,
                  });
                }}
              >
                {(Object.entries(BADGE_CRITERIA_LABELS) as Array<
                  [BadgeCriteriaKey, string]
                >).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label} {isBadgeCriterionAvailable(key) ? "— available" : "— future feature"}
                  </option>
                ))}
              </select>
            </label>
            {!isBadgeCriterionAvailable(draft.criteriaKey) && (
              <p className="rounded-xl bg-violet-100 p-3 text-sm font-semibold text-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
                This definition can be saved for planning, but remains paused
                until its roadmap feature provides trusted progress events.
              </p>
            )}
            <div className="flex flex-wrap gap-5">
              <label className="inline-flex min-h-11 items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={draft.isHidden}
                  onChange={(event) =>
                    setDraft({ ...draft, isHidden: event.currentTarget.checked })
                  }
                />
                Secret until unlocked
              </label>
              <label className="inline-flex min-h-11 items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  disabled={!isBadgeCriterionAvailable(draft.criteriaKey)}
                  onChange={(event) =>
                    setDraft({ ...draft, isActive: event.currentTarget.checked })
                  }
                />
                Active
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setFormErrors({});
                  setDraft(null);
                }}
              >
                Cancel
              </Button>
              <LoadingButton
                isPending={isPending}
                pendingLabel="Saving"
                onClick={save}
              >
                {draft.id ? "Save changes" : "Create badge"}
              </LoadingButton>
            </div>
          </div>
        )}
      </section>

      {canAward && (
        <section
          id="manual-badge-award"
          className="scroll-mt-6 rounded-2xl border bg-card p-5"
        >
          <h2 className="flex items-center gap-2 font-heading text-xl font-black">
            <AwardIcon className="size-5 text-amber-500" aria-hidden="true" />
            Manual award
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Super Admin grants are permanent, rewarded once, and written to the audit trail.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <select
              className="min-h-11 rounded-xl border border-input bg-background px-3"
              value={awardBadgeId}
              onChange={(event) => setAwardBadgeId(event.currentTarget.value)}
            >
              {badges.map((badge) => (
                <option key={badge.id} value={badge.id}>{badge.name}</option>
              ))}
            </select>
            <UserEmailAutocomplete
              value={userEmail}
              onValueChange={setUserEmail}
              disabled={isPending}
            />
            <LoadingButton
              isPending={isPending}
              pendingLabel="Awarding"
              disabled={!awardBadgeId || !userEmail}
              onClick={award}
            >
              Award badge
            </LoadingButton>
          </div>
        </section>
      )}

      <section className="rounded-2xl border bg-card p-4">
        <label className="relative block">
          <span className="sr-only">Find a badge</span>
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            className="min-h-12 w-full rounded-xl border border-input bg-background pr-4 pl-10"
            placeholder="Find by name, description, category, rarity, or criterion"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
          />
        </label>
        <p className="mt-2 text-xs font-semibold text-muted-foreground">
          Showing {visibleBadges.length} of {badges.length} badges
        </p>
      </section>

      <div className="grid gap-3">
        {visibleBadges.map((badge) => (
          <article
            key={badge.id}
            className="flex w-full min-w-0 flex-col gap-4 rounded-2xl border bg-card p-4 lg:flex-row lg:items-center"
          >
            <span className="grid size-12 place-items-center rounded-xl bg-muted text-2xl">
              {badge.icon ?? "🏅"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-black">{badge.name}</h2>
                {!isBadgeCriterionAvailable(badge.criteriaKey) && (
                  <span className="rounded-full bg-violet-100 px-2 py-1 text-[0.65rem] font-black text-violet-800 uppercase dark:bg-violet-950/50 dark:text-violet-200">
                    Future feature
                  </span>
                )}
                {!badge.isActive && (
                  <span className="rounded-full bg-muted px-2 py-1 text-[0.65rem] font-black uppercase">
                    Paused
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {badge.category} · {badge.rarity} · {badge.targetValue} target · {badge.rewardAmount} Glow
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs font-bold text-muted-foreground">
                <BarChart3Icon className="size-3.5" aria-hidden="true" />
                {badge.unlockCount} {badge.unlockCount === 1 ? "player has" : "players have"} unlocked this badge
              </p>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:flex">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => edit(badge)}
              >
                <EditIcon aria-hidden="true" />
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={
                  isPending ||
                  (!badge.isActive &&
                    !isBadgeCriterionAvailable(badge.criteriaKey))
                }
                onClick={() => toggle(badge)}
              >
                {badge.isActive ? <PauseIcon /> : <PlayIcon />}
                {badge.isActive ? "Pause" : "Activate"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="col-span-2 min-h-11 text-red-700 hover:bg-red-50 hover:text-red-800 dark:text-red-300 dark:hover:bg-red-950/30 sm:col-span-1"
                disabled={isPending || badge.unlockCount > 0}
                title={
                  badge.unlockCount > 0
                    ? "Earned badges are permanent and cannot be deleted."
                    : "Delete this badge and any partial progress."
                }
                onClick={() => setDeleteCandidate(badge)}
              >
                <Trash2Icon aria-hidden="true" />
                Delete
              </Button>
            </div>
          </article>
        ))}
        {visibleBadges.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
            <SearchIcon className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 font-black">No badges match that search.</p>
            <Button
              type="button"
              variant="ghost"
              className="mt-2"
              onClick={() => setSearchQuery("")}
            >
              Clear search
            </Button>
          </div>
        )}
      </div>
      <Dialog
        open={deleteCandidate !== null}
        onOpenChange={(open) => {
          if (!open && !isPending) setDeleteCandidate(null);
        }}
      >
        <DialogContent showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>Delete {deleteCandidate?.name}?</DialogTitle>
            <DialogDescription>
              This permanently removes the badge and all partial player
              progress. It is allowed only because no player has unlocked it.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={isPending}
                />
              }
            >
              Cancel
            </DialogClose>
            <LoadingButton
              isPending={isPending}
              pendingLabel="Deleting"
              className="min-h-11 bg-red-600 text-white hover:bg-red-500"
              onClick={deleteBadge}
            >
              Delete permanently
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
}
