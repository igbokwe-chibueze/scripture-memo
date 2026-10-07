/**
 * Integration coverage for Better Auth's central account-ban enforcement.
 *
 * Run with the isolated Prisma Local test database only:
 * `tsx --conditions=react-server --test features/auth/lib/account-suspension.integration.test.ts`.
 * The database URL guard rejects the development listener and hosted services.
 * The test creates one uniquely named synthetic identity, exercises the same
 * public Better Auth POST handler used by `/api/auth/*`, then deletes only that
 * identity and its dependent rows. It sends no email and never touches player
 * or curriculum records.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import "dotenv/config";
import { requireSafeTestDatabaseUrl } from "@/lib/testing/test-database-guard";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const applicationDatabaseUrl = process.env.DATABASE_URL;
let disconnectTestPrisma: (() => Promise<void>) | undefined;

after(async () => {
  await disconnectTestPrisma?.();
});

test(
  "the public Better Auth sign-in route rejects a suspended account without exposing its status",
  { skip: testDatabaseUrl ? false : "TEST_DATABASE_URL is not configured." },
  async () => {
    if (!testDatabaseUrl) return;

    // WHY: Set the guarded integration URL before importing Prisma or Better
    // Auth. Their singletons capture their database configuration at import.
    requireSafeTestDatabaseUrl({
      applicationDatabaseUrl,
      confirmation: process.env.TEST_DATABASE_CONFIRMATION,
      testDatabaseUrl,
    });
    process.env.DATABASE_URL = testDatabaseUrl;

    const [{ prisma }, { auth }, authRouteHandler] = await Promise.all([
      import("@/lib/prisma"),
      import("@/lib/auth/auth"),
      import("@/lib/auth/auth-route-handler"),
    ]);
    disconnectTestPrisma = () => prisma.$disconnect();

    const userId = randomUUID();
    const email = `suspended-${userId}@example.test`;
    const password = `Test-only-${randomUUID()}!`;
    const authContext = await auth.$context;
    const passwordHash = await authContext.password.hash(password);

    try {
      // WHY: Seed only the auth identity needed for sign-in. Marking the email
      // verified lets this test reach the suspension hook rather than stopping
      // earlier at the unrelated email-verification requirement.
      await prisma.user.create({
        data: {
          id: userId,
          name: "Suspension integration test",
          email,
          emailVerified: true,
        },
      });
      await prisma.account.create({
        data: {
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          userId,
          password: passwordHash,
        },
      });

      const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
      const signInResponse = await authRouteHandler.POST(
        new Request(`${baseUrl}/api/auth/sign-in/email`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: baseUrl,
          },
          body: JSON.stringify({ email, password }),
        }),
      );
      assert.equal(signInResponse.status, 200);

      // Capture the real Better Auth session and cookie-cache cookies, then
      // suspend the account without deleting that session to model the narrow
      // sign-in/suspension race that can occur between two concurrent writes.
      const cookieHeader = signInResponse.headers
        .getSetCookie()
        .map((cookie) => cookie.split(";", 1)[0])
        .join("; ");
      assert.ok(cookieHeader, "A successful test sign-in must set session cookies.");
      await prisma.user.update({
        where: { id: userId },
        data: {
          banned: true,
          banReason: "Integration test suspension",
          suspendedAt: new Date(),
          suspendReason: "Integration test suspension",
        },
      });

      const sessionResponse = await authRouteHandler.GET(
        new Request(`${baseUrl}/api/auth/get-session`, {
          headers: { cookie: cookieHeader },
        }),
      );
      const sessionBody: unknown = await sessionResponse.json();

      // WHY: Server and browser session validation must reject and revoke an
      // already-created session after suspension, not only block future logins.
      assert.equal(sessionBody, null);
      assert.equal(
        await prisma.session.count({ where: { userId } }),
        0,
        "A session observed on a banned account must be deleted permanently.",
      );

      const response = await authRouteHandler.POST(
        new Request(`${baseUrl}/api/auth/sign-in/email`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: baseUrl,
          },
          body: JSON.stringify({ email, password }),
        }),
      );
      const responseBody: unknown = await response.json();

      // WHY: The plugin's central create-session hook must block the request,
      // while the route adapter masks suspension as a normal credential error.
      assert.equal(response.status, 401);
      assert.deepEqual(responseBody, {
        message: "Invalid email or password",
        code: "INVALID_EMAIL_OR_PASSWORD",
      });
      assert.equal(
        await prisma.session.count({ where: { userId } }),
        0,
        "A suspended account must not receive a session through the direct auth route.",
      );
    } finally {
      // Scope destructive cleanup to this test's UUID-created identity only.
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  },
);
