"use client";

import { ConceptLunaMascot } from "@/components/shared/concept-luna-mascot";
import { LunaMascot, type LunaPose } from "@/components/shared/luna-mascot";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const lunaGallery: ReadonlyArray<{
  pose: LunaPose;
  label: string;
  use: string;
  square?: boolean;
}> = [
  { pose: "avatar", label: "Avatar", use: "Brand and profile marks", square: true },
  { pose: "bust", label: "Bust", use: "Profile cards and identity moments", square: true },
  { pose: "guide", label: "Guide", use: "Introductions and empty states" },
  { pose: "celebrate", label: "Celebrate", use: "Major achievements" },
  { pose: "encourage", label: "Encourage", use: "Hints and learning support" },
  { pose: "loading", label: "Loading", use: "Waiting transitions" },
  { pose: "retry", label: "Retry", use: "Recoverable mistakes" },
  { pose: "reward", label: "Reward", use: "Glow Points and unlocks" },
  { pose: "worried", label: "Worried", use: "Large streak warning" },
  { pose: "disappointed", label: "Disappointed", use: "Large reset acknowledgement" },
  { pose: "angry", label: "Urgent", use: "Large final streak warning" },
  {
    pose: "notificationWorried",
    label: "Worried compact",
    use: "Early notification warning",
    square: true,
  },
  {
    pose: "notificationDisappointed",
    label: "Reset compact",
    use: "Post-reset notification",
    square: true,
  },
  {
    pose: "notificationAngry",
    label: "Urgent compact",
    use: "Final notification warning",
    square: true,
  },
  {
    pose: "silhouette",
    label: "Silhouette",
    use: "Reserved Luna visual mark",
    square: true,
  },
] as const;

type LunaGalleryProps = {
  collection: "production" | "concept";
};

/** Renders one full pose collection using an identical comparison grid. */
function LunaGallery({ collection }: LunaGalleryProps): React.ReactNode {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {lunaGallery.map((item) => (
          <article
            key={item.pose}
            className="overflow-hidden rounded-3xl border bg-card shadow-sm"
          >
            <div className="grid aspect-square place-items-center overflow-hidden bg-linear-to-br from-amber-50 via-orange-50 to-violet-100 p-3 dark:from-slate-900 dark:via-violet-950 dark:to-slate-950">
              {collection === "production" ? (
                <LunaMascot
                  pose={item.pose}
                  decorative
                  sizes="(max-width: 640px) 44vw, (max-width: 1024px) 28vw, 240px"
                  className={item.square ? "max-h-full w-full" : "h-full w-auto"}
                />
              ) : (
                <ConceptLunaMascot
                  pose={item.pose}
                  decorative
                  sizes="(max-width: 640px) 44vw, (max-width: 1024px) 28vw, 240px"
                  className={item.square ? "max-h-full w-full" : "h-full w-auto"}
                />
              )}
            </div>
            <div className="p-3">
              <h3 className="font-heading text-sm font-black">{item.label}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.use}</p>
            </div>
          </article>
        ))}
    </div>
  );
}

/** Displays production and experimental Luna assets without changing live UI. */
export function LunaMascotPreview(): React.ReactNode {
  return (
    <section className="space-y-4" aria-labelledby="luna-gallery-title">
      <div>
        <p className="text-xs font-black tracking-[0.18em] text-primary uppercase">
          Mascot system
        </p>
        <h2 id="luna-gallery-title" className="mt-1 font-heading text-2xl font-black">
          Luna gallery
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Compare the approved production art with the new concept. Concept Luna
          is preview-only until a screen receives explicit approval.
        </p>
      </div>

      <Tabs defaultValue="production">
        <TabsList className="h-12 w-full max-w-md rounded-2xl p-1">
          <TabsTrigger value="production" className="rounded-xl font-bold">
            Current Luna
          </TabsTrigger>
          <TabsTrigger value="concept" className="rounded-xl font-bold">
            Concept Luna
          </TabsTrigger>
        </TabsList>
        <TabsContent value="production" className="pt-3">
          <LunaGallery collection="production" />
        </TabsContent>
        <TabsContent value="concept" className="pt-3">
          <LunaGallery collection="concept" />
        </TabsContent>
      </Tabs>
    </section>
  );
}
