import { prisma } from "@/lib/prisma";

/**
 * Clears every application table in the already-migrated integration database.
 *
 * This repository is reachable only from the guarded maintenance script. The
 * SQL contains no user-controlled identifier or value: PostgreSQL discovers
 * table names from its own `pg_tables` catalogue and quotes each identifier
 * before execution. `_prisma_migrations` is deliberately preserved so the test
 * resource retains its verified migration history and schema.
 *
 * A single server-side block avoids one hosted-database operation per model and
 * `CASCADE` lets PostgreSQL respect the current foreign-key graph. The method
 * always disconnects its pool so a failed maintenance command cannot leave Node
 * waiting on an open database handle.
 */
export async function clearIntegrationTestDatabase(): Promise<void> {
  try {
    // WHY `$executeRawUnsafe` is acceptable here: PostgreSQL's anonymous `DO`
    // block cannot be represented by Prisma's model API, while this complete SQL
    // string is static and receives no external input whatsoever.
    await prisma.$executeRawUnsafe(`
      DO $$
      DECLARE
        application_table RECORD;
      BEGIN
        FOR application_table IN
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename <> '_prisma_migrations'
        LOOP
          EXECUTE format(
            'TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE',
            application_table.tablename
          );
        END LOOP;
      END
      $$;
    `);

    // These inexpensive checks fail closed if a future database permission or
    // table change causes the reset block to leave curriculum or identity data.
    const [waypointCount, userCount] = await Promise.all([
      prisma.waypoint.count(),
      prisma.user.count(),
    ]);

    if (waypointCount !== 0 || userCount !== 0) {
      throw new Error(
        "The integration database reset did not remove all application fixtures.",
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}
