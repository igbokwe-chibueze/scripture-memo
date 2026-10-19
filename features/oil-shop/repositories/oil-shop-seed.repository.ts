import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { normalizePostgresSslUrl } from "@/lib/database/normalize-postgres-ssl-url";
import { HINT_PACK_ITEM_TYPE, HINT_SHOP_CATALOG } from "@/features/oil-shop/data/hint-shop-catalog";
import { AVATAR_ITEM_TYPE, AVATAR_SHOP_CATALOG } from "../data/avatar-shop-catalog";

const connectionString = process.env.DATABASE_URL;

// WHY: Seeding runs outside Next.js, so this repository owns a dedicated pool
// and fails before opening it when deployment configuration is incomplete.
if (!connectionString) throw new Error("DATABASE_URL is required to seed Oil Shop items.");

const seedClient = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: normalizePostgresSslUrl(connectionString),
  }),
});

/** Idempotently synchronizes offers without resetting ownership or purchase history. */
export async function seedHintShopCatalog(): Promise<number> {
  const catalog = [
    ...HINT_SHOP_CATALOG.map((item) => ({ ...item, itemType: HINT_PACK_ITEM_TYPE })),
    ...AVATAR_SHOP_CATALOG.map((item) => ({
      slug: item.slug,
      name: item.name,
      description: item.description,
      cost: item.cost,
      grantQuantity: item.grantQuantity,
      itemType: AVATAR_ITEM_TYPE,
    })),
  ];
  // One transaction prevents a partial seed from retiring all current offers.
  await seedClient.$transaction([
    seedClient.shopItem.updateMany({
      where: {
        itemType: HINT_PACK_ITEM_TYPE,
        slug: { notIn: HINT_SHOP_CATALOG.map((item) => item.slug) },
      },
      data: { isActive: false },
    }),
    ...catalog.map((item) => seedClient.shopItem.upsert({
      where: { slug: item.slug },
      create: { ...item, isActive: true },
      update: { ...item, isActive: true },
    })),
  ]);
  return catalog.length;
}

/** Releases the short-lived seed connection on success or failure. */
export async function disconnectOilShopSeedRepository(): Promise<void> {
  await seedClient.$disconnect();
}
