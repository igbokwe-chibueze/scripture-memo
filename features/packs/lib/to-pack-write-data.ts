import { slugifyPackName } from "@/features/packs/lib/pack-slug";
import type { PackFormValues } from "@/features/packs/schemas/pack.schema";
import type { PackWriteData } from "@/features/packs/types/pack.types";

/** Maps validated form metadata into the repository's write contract. */
export function toPackWriteData(values: PackFormValues): PackWriteData {
  return {
    name: values.name,
    description: values.description || null,
    slug: slugifyPackName(values.name),
  };
}
