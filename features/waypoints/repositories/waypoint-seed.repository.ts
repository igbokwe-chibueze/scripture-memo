import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import type { WaypointSeedData } from "@/features/waypoints/types/waypoint.types";

const connectionString = process.env.DATABASE_URL;

// WHY: The seed runs as a standalone process rather than through Next.js, so it
// owns a short-lived client instead of importing the server-only runtime singleton.
if (!connectionString) throw new Error("DATABASE_URL is required to seed waypoints.");

const seedClient = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Inserts missing slots without changing existing curriculum assignments. */
export async function seedWaypointPlaceholders(rows: WaypointSeedData[]): Promise<number> {
  const result = await seedClient.waypoint.createMany({ data: rows, skipDuplicates: true });
  return result.count;
}

/** Releases the seed-only PostgreSQL pool on both success and failure. */
export async function disconnectWaypointSeedRepository(): Promise<void> {
  await seedClient.$disconnect();
}
