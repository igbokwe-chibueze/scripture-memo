import type { UserRole } from "@/lib/generated/prisma/enums";

/**
 * Minimal trusted session shape required by application permission helpers.
 * Keeping this structural avoids coupling authorization logic to one Better Auth
 * response wrapper while still requiring a server-derived role.
 */
export type PermissionSession = {
  user?: {
    role?: UserRole | null;
  } | null;
} | null;

/** Returns true for both regular administrators and Super Admins. */
export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Returns true only for the highest-privilege application role. */
export function isSuperAdmin(role: UserRole | null | undefined): boolean {
  return role === "SUPER_ADMIN";
}

/**
 * Requires an authenticated administrator session.
 *
 * Permission checks must run inside every protected Server Action because
 * Next.js Proxy guards navigation only; an attacker can invoke an action
 * directly. Callers should translate this generic error into the standard safe
 * action response without exposing internal authorization state.
 */
export function requireAdmin(session: PermissionSession): void {
  if (!isAdmin(session?.user?.role)) {
    throw new Error("Administrator access is required.");
  }
}

/**
 * Requires an authenticated Super Admin session for platform-wide operations.
 *
 * This stricter guard prevents regular administrators from performing role
 * changes, manual awards, and other operations reserved for Super Admins.
 */
export function requireSuperAdmin(session: PermissionSession): void {
  if (!isSuperAdmin(session?.user?.role)) {
    throw new Error("Super Admin access is required.");
  }
}
