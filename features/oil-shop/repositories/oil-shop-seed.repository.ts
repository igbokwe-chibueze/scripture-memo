import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { normalizePostgresSslUrl } from "@/lib/database/normalize-postgres-ssl-url";
import { HINT_PACK_ITEM_TYPE, HINT_SHOP_CATALOG } from "@/features/oil-shop/data/hint-shop-catalog";

const connectionString = process.env.DATABASE_URL;

// WHY: Seeding runs outside Next.js, so this repository owns a dedicated pool
// and fails before opening it when deployment configuration is incomplete.
if (!connectionString) throw new Error("DATABASE_URL is required to seed Oil Shop items.");

const seedClient = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: normalizePostgresSslUrl(connectionString),
  }),
});

/** Idempotently synchronizes the first-party hint catalogue without touching purchases. */
export async function seedHintShopCatalog(): Promise<number> {
  await Promise.all(HINT_SHOP_CATALOG.map((item) => seedClient.shopItem.upsert({
    where: { slug: item.slug },
    create: { ...item, itemType: HINT_PACK_ITEM_TYPE, isActive: true },
    update: { name: item.name, description: item.description, cost: item.cost, grantQuantity: item.grantQuantity, itemType: HINT_PACK_ITEM_TYPE },
  })));
  return HINT_SHOP_CATALOG.length;
}

/** Releases the short-lived seed connection on success or failure. */
export async function disconnectOilShopSeedRepository(): Promise<void> {
  await seedClient.$disconnect();
}
