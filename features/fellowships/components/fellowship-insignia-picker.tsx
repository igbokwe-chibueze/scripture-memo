"use client";

import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { FellowshipInsignia } from "@/features/fellowships/components/fellowship-insignia";
import { FELLOWSHIP_INSIGNIAS, type FellowshipInsigniaKey } from "@/features/fellowships/constants/fellowship-insignias";
import { cn } from "@/lib/utils";

export type FellowshipInsigniaPickerProps = { value: FellowshipInsigniaKey; onChange: (value: FellowshipInsigniaKey) => void };

/** Accessible fixed-catalogue selector; arbitrary image paths are never accepted. */
export function FellowshipInsigniaPicker({ value, onChange }: FellowshipInsigniaPickerProps): React.ReactNode {
  const t = useTranslations("Fellowships");
  return <fieldset><legend className="font-black">{t("chooseInsignia")}</legend><p className="mt-1 text-sm text-muted-foreground">{t("insigniaDescription")}</p><div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">{FELLOWSHIP_INSIGNIAS.map((insignia) => { const selected = insignia.key === value; const label = t(insignia.labelKey); return <button key={insignia.key} type="button" aria-label={label} aria-pressed={selected} onClick={() => onChange(insignia.key)} className={cn("relative rounded-2xl border-2 bg-slate-950 p-1.5 transition-transform active:translate-y-0.5", selected ? "border-amber-400 ring-4 ring-amber-400/20" : "border-border hover:border-violet-400")}><FellowshipInsignia insigniaKey={insignia.key} label={label} className="w-full rounded-xl" />{selected && <span className="absolute right-1 bottom-1 grid size-7 place-items-center rounded-full bg-amber-400 text-slate-950 shadow-lg"><CheckIcon className="size-4" aria-hidden="true" /></span>}</button>; })}</div></fieldset>;
}

