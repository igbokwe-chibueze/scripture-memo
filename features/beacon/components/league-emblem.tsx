import Image from "next/image";
import type { BeaconLeague } from "@/lib/generated/prisma/enums";
import { getLeagueCatalogEntry } from "@/features/beacon/data/league-catalog";
import { cn } from "@/lib/utils";

/** Renders one consistently framed league asset without duplicating metadata. */
export function LeagueEmblem({
  league,
  label,
  className,
  priority = false,
}: {
  league: BeaconLeague;
  label: string;
  className?: string;
  priority?: boolean;
}): React.ReactNode {
  const entry = getLeagueCatalogEntry(league);
  return (
    <Image
      src={entry.imagePath}
      alt={label}
      width={640}
      height={640}
      priority={priority}
      className={cn("size-full object-contain", className)}
      sizes="(max-width: 640px) 144px, 180px"
    />
  );
}
