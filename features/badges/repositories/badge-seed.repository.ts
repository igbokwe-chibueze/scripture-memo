import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { BADGE_CATALOG } from "@/features/badges/data/badge-catalog";

const connectionString = process.env.DATABASE_URL;

// WHY: The seed executes outside Next.js and must not import the server-only
// application singleton. This dedicated client owns and closes its short-lived
// PostgreSQL pool regardless of seed success or failure.
if (!connectionString) throw new Error("DATABASE_URL is required to seed badges.");

const badgeSeedClient = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/**
 * Synchronizes the approved badge catalogue while preserving learner progress.
 *
 * WHY: Earlier environments may already contain badge rows. Upserting by slug
 * updates their criteria and approved rewards without deleting or recreating
 * the relational progress records attached to those stable badge identities.
 */
export async function seedBadgeCatalog(): Promise<number> {
  await badgeSeedClient.$transaction(
    BADGE_CATALOG.map((definition) =>
      badgeSeedClient.badge.upsert({
        where: { slug: definition.slug },
        update: {
          name: definition.name,
          description: definition.description,
          icon: definition.icon,
          category: definition.category,
          rarity: definition.rarity,
          criteriaKey: definition.criteriaKey,
          targetValue: definition.targetValue,
          rewardAmount: definition.rewardAmount,
          isHidden: definition.isHidden ?? false,
        },
        create: {
          ...definition,
          isHidden: definition.isHidden ?? false,
          isActive: definition.isActive ?? true,
        },
      }),
    ),
  );
  return BADGE_CATALOG.length;
}

/** Releases the badge seed's standalone PostgreSQL connection pool. */
export async function disconnectBadgeSeedRepository(): Promise<void> {
  await badgeSeedClient.$disconnect();
}
