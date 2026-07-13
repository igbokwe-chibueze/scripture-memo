"use client";

import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Combobox } from "@base-ui/react/combobox";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
};

export type SearchableSelectProps = {
  value: string;
  options: readonly SearchableSelectOption[];
  onValueChange: (value: string) => void;
  label: string;
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
};

/**
 * Accessible searchable selector for long, predefined option lists.
 * Short lists should continue using the simpler Select component so routine
 * choices are not burdened with an unnecessary search interaction.
 */
export function SearchableSelect({
  value,
  options,
  onValueChange,
  label,
  placeholder,
  searchPlaceholder = "Search options…",
  emptyMessage = "No matching options.",
  disabled = false,
  invalid = false,
  className,
}: SearchableSelectProps): React.ReactNode {
  const selectedOption = options.find((option) => option.value === value) ?? null;

  return (
    <Combobox.Root
      items={[...options]}
      value={selectedOption}
      disabled={disabled}
      itemToStringLabel={(option) => option.label}
      itemToStringValue={(option) => option.value}
      isItemEqualToValue={(option, selected) => option.value === selected.value}
      onValueChange={(option) => onValueChange(option?.value ?? "")}
    >
      <Combobox.Label className="sr-only">{label}</Combobox.Label>
      <Combobox.Trigger
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-input bg-background px-3 text-left text-sm outline-none transition-colors",
          "hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          invalid && "border-destructive ring-3 ring-destructive/20",
          className,
        )}
        aria-invalid={invalid}
      >
        <Combobox.Value placeholder={placeholder} />
        <Combobox.Icon className="text-muted-foreground">
          <ChevronsUpDown className="size-4" aria-hidden="true" />
        </Combobox.Icon>
      </Combobox.Trigger>

      <Combobox.Portal>
        <Combobox.Positioner className="z-50" align="start" sideOffset={6}>
          <Combobox.Popup className="w-(--anchor-width) min-w-64 overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95">
            <div className="relative border-b p-2">
              <Search className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Combobox.Input
                autoFocus
                placeholder={searchPlaceholder}
                className="min-h-10 w-full rounded-lg bg-muted/50 pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="max-h-72 overflow-y-auto p-1.5">
              <Combobox.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </Combobox.Empty>
              <Combobox.List>
                {(option: SearchableSelectOption) => (
                  <Combobox.Item
                    key={option.value || "empty"}
                    value={option}
                    className="flex min-h-10 cursor-default items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    <Combobox.ItemIndicator className="flex size-5 items-center justify-center text-primary">
                      <Check className="size-4" aria-hidden="true" />
                    </Combobox.ItemIndicator>
                    <span>{option.label}</span>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </div>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
