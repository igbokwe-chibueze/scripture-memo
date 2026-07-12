import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

// WHY: Next.js development hot reloading evaluates modules repeatedly. Keeping
// the client on globalThis allows every evaluation to reuse one connection pool
// instead of opening enough PostgreSQL pools to exhaust the database limit.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const connectionString = process.env.DATABASE_URL;

// WHY: Prisma 7 requires a driver adapter and therefore needs the connection
// string while this server-only module initializes. Failing immediately provides
// a clear configuration error instead of a vague connection failure on a query.
if (!connectionString) {
  throw new Error("DATABASE_URL is required to initialize Prisma.");
}

// WHY: Prisma 7 no longer creates its own database driver internally. PrismaPg
// owns the PostgreSQL connection pool, while Prisma Client provides the generated,
// type-safe query API for the schema in prisma/schema.prisma.
const adapter = new PrismaPg({
  connectionString,
});

// WHY: Production modules are evaluated once per process, while development uses
// the cached global client above. Both environments therefore expose exactly one
// application-level Prisma Client instance from this module.
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
