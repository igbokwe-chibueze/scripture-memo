"use client";

/** One authenticated coordinator batches explicit progress intents. Latest state
 * is retained per plan through offline failures; there is no polling or routine
 * initialization. Only pending explicit changes recover on mount/online/retry.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { updateReadingPlanParticipationAction } from "../actions/reading-plan-participation.action";
import { readingPlanParticipationSchema } from "../schemas/reading-plan-participation.schema";
import {
  PLAN_PARTICIPATION_INTENT,
  PLAN_PARTICIPATION_UPDATED,
} from "../lib/reading-plan-participation-events";
import {
  participationQueueSchema,
  shouldSyncParticipation,
  type ParticipationQueue,
} from "../lib/reading-plan-participation-batching";
import {
  READING_PLANS,
  type ReadingPlanId,
} from "../data/reading-plan-catalog";
import { showActionError } from "@/lib/errors/show-action-error";
import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";

/** Scope is an opaque account cache namespace; the server never accepts it as identity. */
export function useReadingPlanParticipationSync(scope: string): {
  failed: boolean;
  retry: () => void;
} {
  const t = useTranslations("ReadingPlans");
  const failureMessage = t("participationFailed");
  const [failed, setFailed] = useState(false);
  const retryRef = useRef<() => void>(() => undefined);
  const retry = useCallback((): void => retryRef.current(), []);

  useEffect(() => {
    let mounted = true;
    // This ID only pairs an in-flight response with its effect-local queue.
    // A monotonic counter is sufficient; secure-context Web Crypto would fail
    // when testing the app from another device over a local HTTP address.
    let intentSequence = 0;
    const states = new Map<ReadingPlanId, ParticipationQueue>();
    const busy = new Set<ReadingPlanId>();
    const failures = new Set<ReadingPlanId>();
    const key = (planId: ReadingPlanId): string =>
      `scripture-memo:participation:${scope}:${planId}:v1`;
    for (const planId of Object.keys(READING_PLANS) as ReadingPlanId[]) {
      try {
        const parsed = participationQueueSchema.safeParse(
          JSON.parse(window.localStorage.getItem(key(planId)) ?? "{}"),
        );
        states.set(planId, parsed.success ? parsed.data : {});
      } catch {
        states.set(planId, {});
      }
    }

    function store(planId: ReadingPlanId, state: ParticipationQueue): void {
      states.set(planId, state);
      // The in-memory queue remains usable if optional metadata storage fails.
      // Device chapter progress uses its own existing, independently handled key.
      try {
        window.localStorage.setItem(key(planId), JSON.stringify(state));
      } catch {
        /* Retry remains available for this session. */
      }
    }

    async function flush(planId: ReadingPlanId): Promise<void> {
      if (!mounted || busy.has(planId) || !navigator.onLine) return;
      busy.add(planId);
      try {
        while (mounted) {
          const pending = states.get(planId)?.pending;
          if (!pending) break;
          const result = await updateReadingPlanParticipationAction({
            planId,
            operation: pending.operation,
          });
          if (!result.success || !result.data) {
            failures.add(planId);
            if (mounted) setFailed(true);
            if (!result.success)
              showActionError(result, "reading-plan-participation");
            break;
          }
          const current = states.get(planId) ?? {};
          // An edit made during the request must not be erased by its response.
          store(planId, {
            ack: { operation: pending.operation, day: result.data.day },
            ...(current.pending?.eventId !== pending.eventId
              ? { pending: current.pending }
              : {}),
          });
          failures.delete(planId);
          if (mounted) {
            setFailed(failures.size > 0);
            window.dispatchEvent(
              new CustomEvent(PLAN_PARTICIPATION_UPDATED, {
                detail: { planId },
              }),
            );
          }
        }
      } catch {
        failures.add(planId);
        if (mounted) setFailed(true);
        toast.error(failureMessage, { id: "reading-plan-participation" });
      } finally {
        busy.delete(planId);
      }
    }

    function flushAll(): void {
      if (document.hidden) return;
      for (const planId of states.keys()) void flush(planId);
    }

    function onIntent(event: Event): void {
      if (!(event instanceof CustomEvent)) return;
      const parsed = readingPlanParticipationSchema.safeParse(event.detail);
      if (!parsed.success) return;
      const { planId } = parsed.data;
      let { operation } = parsed.data;
      const current = states.get(planId) ?? {};
      if (operation === "start" && current.pending) {
        // Reopening must not erase pending completion; a reset followed by a
        // fresh start needs active state even if reset has not reached the server.
        if (current.pending.operation === "reset") operation = "activity";
        else {
          void flush(planId);
          return;
        }
      }
      if (current.pending?.operation === operation) {
        void flush(planId);
        return;
      }
      if (
        !current.pending &&
        !shouldSyncParticipation(
          operation,
          current.ack,
          new Date().toISOString().slice(0, 10),
        )
      )
        return;
      store(planId, {
        ...current,
        pending: {
          operation,
          eventId: `${Date.now()}:${++intentSequence}`,
        },
      });
      if (!navigator.onLine) setFailed(true);
      void flush(planId);
    }

    retryRef.current = flushAll;
    window.addEventListener(PLAN_PARTICIPATION_INTENT, onIntent);
    window.addEventListener("online", flushAll);
    document.addEventListener("visibilitychange", flushAll);
    // This is recovery of previously confirmed intent only, not read-time enrollment.
    flushAll();
    return () => {
      mounted = false;
      retryRef.current = () => undefined;
      window.removeEventListener(PLAN_PARTICIPATION_INTENT, onIntent);
      window.removeEventListener("online", flushAll);
      document.removeEventListener("visibilitychange", flushAll);
    };
  }, [scope, failureMessage]);
  return { failed, retry };
}
