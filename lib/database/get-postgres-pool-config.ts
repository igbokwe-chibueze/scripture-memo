import type { PoolConfig } from "pg";
import { normalizePostgresSslUrl } from "./normalize-postgres-ssl-url";

const LOOPBACK_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Builds the node-postgres pool settings shared by every PrismaPg client.
 *
 * Prisma Postgres Local currently closes extra concurrent TCP connections in
 * this development setup. Limiting only loopback databases to one connection
 * keeps parallel application reads reliable: node-postgres queues those reads
 * on the healthy local connection instead of dropping them. Hosted databases
 * retain the driver's normal pool size, so this development compatibility rule
 * does not reduce production concurrency or throughput.
 */
export function getPostgresPoolConfig(connectionString: string): PoolConfig {
  const normalizedConnectionString = normalizePostgresSslUrl(connectionString);
  const databaseHost = new URL(normalizedConnectionString).hostname;

  return {
    connectionString: normalizedConnectionString,
    ...(LOOPBACK_DATABASE_HOSTS.has(databaseHost) ? { max: 1 } : {}),
  };
}
