import type { PoolConfig } from "pg";
import { normalizePostgresSslUrl } from "./normalize-postgres-ssl-url";

const LOOPBACK_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const PRISMA_LOCAL_DATABASE_PORTS = new Set(["51214", "51224"]);

/**
 * Builds the node-postgres pool settings shared by every PrismaPg client.
 *
 * Prisma Postgres Local currently closes extra concurrent TCP connections on
 * the project's development and integration ports. Those two named instances
 * therefore use one connection. Other loopback PostgreSQL servers retain the
 * normal driver pool so local multi-connection integration tests can exercise
 * advisory-lock races. Hosted databases also retain the driver's normal pool.
 */
export function getPostgresPoolConfig(connectionString: string): PoolConfig {
  const normalizedConnectionString = normalizePostgresSslUrl(connectionString);
  const databaseUrl = new URL(normalizedConnectionString);
  const isPrismaLocalInstance =
    LOOPBACK_DATABASE_HOSTS.has(databaseUrl.hostname) &&
    PRISMA_LOCAL_DATABASE_PORTS.has(databaseUrl.port);

  return {
    connectionString: normalizedConnectionString,
    ...(isPrismaLocalInstance ? { max: 1 } : {}),
  };
}
