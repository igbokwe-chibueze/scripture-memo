"use client";

import { useEffect, useState } from "react";
import { LoaderCircleIcon, MailIcon } from "lucide-react";
import { searchUserEmailsAction } from "@/features/admin/actions/search-user-emails.action";

/**
 * Predicts bounded account emails without downloading the user directory.
 *
 * Searches begin after three characters and a short pause. Results are cached
 * for the life of the page, so returning to an earlier query causes no database
 * operation. A request sequence prevents a slower old response from replacing
 * newer suggestions after the administrator continues typing.
 */
export function UserEmailAutocomplete({
  value,
  onValueChange,
  disabled = false,
}: {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}): React.ReactNode {
  const [isFocused, setIsFocused] = useState(false);
  const [resultState, setResultState] = useState<{
    query: string;
    suggestions: string[];
    isLoading: boolean;
    error: string | null;
  }>({ query: "", suggestions: [], isLoading: false, error: null });
  const [cachedResults, setCachedResults] = useState<
    Record<string, string[]>
  >({});
  const normalizedQuery = value.trim().toLowerCase();
  const cachedSuggestions = cachedResults[normalizedQuery];

  useEffect(() => {
    if (normalizedQuery.length < 3) return;

    if (cachedSuggestions) return;

    let cancelled = false;

    // WHY: Debouncing prevents one PostgreSQL operation per keystroke. The
    // three-character floor and six-result server cap further bound cost and
    // prevent this privileged helper from exposing the full user directory.
    const timer = window.setTimeout(async () => {
      setResultState({
        query: normalizedQuery,
        suggestions: [],
        isLoading: true,
        error: null,
      });
      const result = await searchUserEmailsAction({ query: normalizedQuery });

      // Ignore a stale response after the administrator continues typing.
      if (cancelled) return;
      if (!result.success) {
        setResultState({
          query: normalizedQuery,
          suggestions: [],
          isLoading: false,
          error: result.message,
        });
        return;
      }

      const matches = result.data?.suggestions ?? [];
      setCachedResults((current) => ({
        ...current,
        [normalizedQuery]: matches,
      }));
      setResultState({
        query: normalizedQuery,
        suggestions: matches,
        isLoading: false,
        error: null,
      });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cachedSuggestions, normalizedQuery]);

  const isCurrentResult = resultState.query === normalizedQuery;
  const suggestions =
    cachedSuggestions ?? (isCurrentResult ? resultState.suggestions : []);
  const isLoading = isCurrentResult && resultState.isLoading;
  const error = isCurrentResult ? resultState.error : null;
  const hasResolved =
    cachedSuggestions !== undefined || (isCurrentResult && !isLoading);

  const showPanel =
    isFocused &&
    normalizedQuery.length >= 3 &&
    (isLoading || hasResolved || Boolean(error) || suggestions.length > 0);

  return (
    <div className="relative">
      <label htmlFor="manual-badge-user-email" className="sr-only">
        Player email
      </label>
      <MailIcon
        className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        id="manual-badge-user-email"
        type="email"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showPanel}
        aria-controls="manual-badge-email-suggestions"
        className="min-h-11 w-full rounded-xl border border-input bg-background pr-10 pl-9"
        placeholder="Start typing a player email"
        value={value}
        disabled={disabled}
        autoComplete="off"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => onValueChange(event.currentTarget.value)}
      />
      {isLoading && (
        <LoaderCircleIcon
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          aria-label="Loading matching emails"
        />
      )}

      {showPanel && (
        <div
          id="manual-badge-email-suggestions"
          role="listbox"
          className="absolute z-40 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl"
        >
          {isLoading ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              Finding accounts…
            </p>
          ) : error ? (
            <p className="px-3 py-4 text-sm text-destructive">{error}</p>
          ) : suggestions.length > 0 ? (
            suggestions.map((email) => (
              <button
                key={email}
                type="button"
                role="option"
                aria-selected={email === value}
                className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-bold hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                // Prevent blur from closing the list before the click selects it.
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => {
                  onValueChange(email);
                  setIsFocused(false);
                }}
              >
                {email}
              </button>
            ))
          ) : (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              No matching active account.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
