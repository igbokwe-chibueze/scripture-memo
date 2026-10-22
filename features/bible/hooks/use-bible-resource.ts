"use client";

/** Shared async resource state for Bible panes; changing keys hides stale data immediately. */
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import type { ActionResult } from "@/types/api";
import { showActionError } from "@/lib/errors/show-action-error";

type ResourceState<T> = { key: string; data: T | undefined; failed: boolean };

/**
 * Callers memoize their loader. An effect-local cancellation flag prevents old
 * responses from overwriting a new verse/filter, including React Strict Mode.
 * Loading is derived from request identity instead of synchronous effect writes.
 * Retry is explicit; there is no polling or hidden initialization.
 */
export function useBibleResource<T>(
  key: string,
  load: () => Promise<ActionResult<T>>,
): {
  data: T | undefined;
  loading: boolean;
  failed: boolean;
  retry: () => void;
  updateData: (update: (current: T) => T) => void;
} {
  const t = useTranslations("Bible");
  // A Server Action can refresh the intl provider and replace its translator
  // function. Depending on that function would refetch on every action response.
  // The translated string is stable across those renders and still updates on
  // an actual interface-language change.
  const failureMessage = t("failed");
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ResourceState<T> | null>(null);
  const identity = `${key}:${attempt}`;
  useEffect(() => {
    let active = true;
    void load()
      .then((result) => {
        if (!active) return;
        if (result.success)
          setState({ key: identity, data: result.data, failed: false });
        else {
          setState({ key: identity, data: undefined, failed: true });
          showActionError(result, `bible-resource:${key}`);
        }
      })
      .catch(() => {
        if (!active) return;
        setState({ key: identity, data: undefined, failed: true });
        toast.error(failureMessage, {
          id: `bible-resource:${key}`,
          duration: Infinity,
        });
      });
    return () => {
      active = false;
    };
  }, [identity, key, load, failureMessage]);
  const updateData = useCallback(
    (update: (current: T) => T): void => {
      setState((current) =>
        current?.key === identity && current.data !== undefined
          ? { ...current, data: update(current.data) }
          : current,
      );
    },
    [identity],
  );
  return {
    data: state?.key === identity ? state.data : undefined,
    loading: state?.key !== identity,
    failed: state?.key === identity && state.failed,
    retry: () => setAttempt((value) => value + 1),
    updateData,
  };
}
