import Image from "next/image";
import { getFellowshipInsignia } from "@/features/fellowships/constants/fellowship-insignias";
import { cn } from "@/lib/utils";

export type FellowshipInsigniaProps = { insigniaKey: string; label: string; className?: string };

/** Renders one physically cropped catalogue asset without neighboring bleed. */
export function FellowshipInsignia({ insigniaKey, label, className }: FellowshipInsigniaProps): React.ReactNode {
  const insignia = getFellowshipInsignia(insigniaKey);
  return <span role="img" aria-label={label} className={cn("relative block aspect-square shrink-0 overflow-hidden bg-[#060817]", className)}><Image src={`/images/fellowships/insignia-${insignia.key}.webp`} alt="" fill sizes="96px" className="object-cover" aria-hidden="true" /></span>;
}
