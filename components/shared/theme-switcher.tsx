"use client";

import { useSyncExternalStore } from "react";
import { LaptopIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ThemeSwitcherProps = {
  /** Optional accessible label when the control appears in a specific context. */
  label?: string;
};

const themeOptions = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: LaptopIcon },
] as const;

/**
 * Provides a stable no-op subscription for hydration-state detection.
 *
 * There is no external event to subscribe to: React compares the false server
 * snapshot with the true browser snapshot immediately after hydration. Defining
 * the function outside the component prevents unnecessary re-subscriptions.
 */
function subscribeToHydration(): () => void {
  return () => undefined;
}

/**
 * Lets users choose light, dark, or operating-system appearance explicitly.
 *
 * next-themes cannot know localStorage or system preferences during server render.
 * React's current useSyncExternalStore server-snapshot API safely distinguishes
 * hydration without the synchronous setState effect rejected by React 19 linting.
 */
export function ThemeSwitcher({
  label = "Choose appearance",
}: ThemeSwitcherProps): React.ReactNode {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  // WHY: The server cannot read next-themes browser storage. Rendering the
  // saved theme icon during the client's first pass would mismatch the server's
  // laptop fallback and force React to discard this hydrated tree. Both sides
  // render LaptopIcon until hydration completes; only then may browser-owned
  // theme state choose the visible icon.
  const ActiveIcon = mounted
    ? themeOptions.find((option) => option.value === theme)?.icon ?? LaptopIcon
    : LaptopIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="min-h-11 min-w-11 rounded-2xl"
            disabled={!mounted}
            aria-label={label}
          />
        }
      >
        <ActiveIcon aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themeOptions.map((option) => {
          const Icon = option.icon;

          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setTheme(option.value)}
            >
              <Icon aria-hidden="true" />
              {option.label}
              {theme === option.value && (
                <span className="ml-auto text-xs text-muted-foreground">Active</span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
