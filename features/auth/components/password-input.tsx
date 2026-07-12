"use client";

import { useState } from "react";
import { CheckIcon, EyeIcon, EyeOffIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  /** Current field value used only for immediate strength feedback. */
  value?: string;
  /** Shows the five-rule strength experience for the new-password field. */
  showStrength?: boolean;
};

const strengthLabels = [
  "Very Weak",
  "Weak",
  "Fair",
  "Good",
  "Good",
  "Strong",
] as const;
const strengthColors = [
  "bg-destructive",
  "bg-destructive",
  "bg-amber-500",
  "bg-lime-500 dark:bg-lime-400",
  "bg-lime-500 dark:bg-lime-400",
  "bg-emerald-500",
] as const;
const strengthTextColors = [
  "text-destructive",
  "text-destructive",
  "text-amber-700 dark:text-amber-300",
  "text-lime-700 dark:text-lime-300",
  "text-lime-700 dark:text-lime-300",
  "text-emerald-700 dark:text-emerald-300",
] as const;

/**
 * Password field with keyboard-accessible visibility and optional live strength.
 *
 * Strength feedback is explanatory only. The Zod schema remains the validation
 * authority on both client and server, including the hidden 128-character cap.
 */
export function PasswordInput({
  value = "",
  showStrength = false,
  className,
  ...props
}: PasswordInputProps): React.ReactNode {
  const [isVisible, setIsVisible] = useState(false);
  const requirements = [
    { label: "At least 8 characters", satisfied: value.length >= 8 },
    { label: "At least 1 lowercase letter", satisfied: /[a-z]/.test(value) },
    { label: "At least 1 uppercase letter", satisfied: /[A-Z]/.test(value) },
    { label: "At least 1 number", satisfied: /[0-9]/.test(value) },
    {
      label: "At least 1 special character",
      satisfied: /[^A-Za-z0-9]/.test(value),
    },
  ] as const;
  const score = requirements.filter((requirement) => requirement.satisfied).length;
  const strengthLabel = strengthLabels[score];
  const shouldShowStrength = showStrength && value.length > 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          type={isVisible ? "text" : "password"}
          className={cn("pr-12", className)}
          {...props}
        />
        <button
          type="button"
          aria-label={isVisible ? "Hide password" : "Show password"}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((visible) => !visible)}
          className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isVisible ? (
            <EyeOffIcon className="size-4" aria-hidden="true" />
          ) : (
            <EyeIcon className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {shouldShowStrength && (
        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/35 p-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="font-medium">{strengthLabel} password. Must contain:</p>
            <span
              className={cn("font-semibold transition-colors", strengthTextColors[score])}
              aria-live="polite"
            >
              {strengthLabel}
            </span>
          </div>

          <div
            role="progressbar"
            aria-label={`Password strength: ${strengthLabel}`}
            aria-valuemin={0}
            aria-valuemax={5}
            aria-valuenow={score}
            className="grid grid-cols-5 gap-1.5"
          >
            {requirements.map((requirement, index) => (
              <span
                key={requirement.label}
                aria-hidden="true"
                className={cn(
                  "h-1.5 rounded-full bg-border transition-colors duration-200",
                  index < score && strengthColors[score],
                )}
              />
            ))}
          </div>

          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {requirements.map((requirement) => (
              <li
                key={requirement.label}
                className={cn(
                  "flex items-center gap-2 transition-colors",
                  requirement.satisfied
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-muted-foreground",
                )}
              >
                {requirement.satisfied ? (
                  <CheckIcon className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <XIcon className="size-4 shrink-0" aria-hidden="true" />
                )}
                <span>{requirement.label}</span>
                <span className="sr-only">
                  {requirement.satisfied ? " — requirement satisfied" : " — requirement not satisfied"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
