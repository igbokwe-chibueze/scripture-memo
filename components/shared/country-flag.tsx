import type { ComponentType, SVGProps } from "react";
import * as flagComponents from "country-flag-icons/react/3x2";
import { Globe2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

type CountryFlagProps = {
  countryCode: string | null;
  label: string;
  className?: string;
};

type FlagSvg = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * Renders a packaged SVG flag instead of a Unicode flag emoji.
 *
 * WHY: Windows commonly renders regional-indicator emoji as visible country
 * letters rather than a flag. Packaged SVGs stay consistent across platforms
 * and avoid a runtime request to an external flag service.
 */
export function CountryFlag({
  countryCode,
  label,
  className,
}: CountryFlagProps): React.ReactNode {
  const normalizedCode = countryCode?.trim().toUpperCase() ?? "";
  const Flag = (
    flagComponents as Record<string, FlagSvg | undefined>
  )[normalizedCode];

  if (!Flag) {
    return (
      <Globe2Icon
        aria-label={label}
        role="img"
        className={cn("size-5 text-sky-500", className)}
      />
    );
  }

  return (
    <Flag
      aria-label={label}
      role="img"
      className={cn(
        "h-5 w-7 rounded-sm object-cover shadow-sm ring-1 ring-black/10",
        className,
      )}
    />
  );
}
