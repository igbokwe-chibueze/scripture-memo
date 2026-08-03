/**
 * Oil Shop catalogue seed.
 *
 * Run with `npm run oil-shop:seed` after the Phase 25 migration and Prisma
 * generation. The script requires DATABASE_URL and may be safely rerun: it
 * upserts only the three first-party hint products by stable slug. It never
 * reads or changes learners, balances, purchases, progression, badges, verses,
 * or waypoints. Existing purchase history remains attached to the same items.
 *
 * Failures produce a non-zero process result and the repository connection is
 * closed in every outcome, so deployment tooling cannot mistake a partial or
 * unreachable seed for success.
 */
import "dotenv/config";
import {
  disconnectOilShopSeedRepository,
  seedHintShopCatalog,
} from "@/features/oil-shop/repositories/oil-shop-seed.repository";

/** Executes the isolated catalogue synchronization and reports its safe count. */
async function run(): Promise<void> {
  try {
    const synchronizedItems = await seedHintShopCatalog();
    process.stdout.write(`Oil Shop seed complete: synchronized ${synchronizedItems} hint packs.\n`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown Oil Shop seed failure.";
    process.stderr.write(`Oil Shop seed failed: ${message}\n`);
    process.exitCode = 1;
  } finally {
    await disconnectOilShopSeedRepository();
  }
}

void run();
