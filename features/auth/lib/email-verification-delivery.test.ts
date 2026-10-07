/**
 * Confirms the auth-email transport defaults and production guard without
 * sending mail or reading deployment secrets. These are important boundaries:
 * local registration must work without spending Resend quota, while production
 * must never expose a bearer verification link through the Light Dev capture.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  captureVerificationEmail,
  deliverVerificationEmail,
  resolveAuthEmailDeliveryMode,
} from "./email-verification-delivery";

test("development and test environments default to Light Dev delivery", () => {
  assert.equal(resolveAuthEmailDeliveryMode(undefined, "development"), "LIGHT_DEV");
  assert.equal(resolveAuthEmailDeliveryMode(undefined, "test"), "LIGHT_DEV");
});

test("production defaults to Resend delivery", () => {
  assert.equal(resolveAuthEmailDeliveryMode(undefined, "production"), "RESEND");
});

test("production cannot expose Light Dev verification URLs", () => {
  assert.throws(
    () => resolveAuthEmailDeliveryMode("LIGHT_DEV", "production"),
    /forbidden in production/,
  );
});

test("unsupported delivery modes fail closed", () => {
  assert.throws(
    () => resolveAuthEmailDeliveryMode("CONSOLE", "development"),
    /must be LIGHT_DEV or RESEND/,
  );
});

test("Light Dev captures the Better Auth URL only in the current operation", async (context) => {
  const previousMode = process.env.AUTH_EMAIL_DELIVERY_MODE;
  process.env.AUTH_EMAIL_DELIVERY_MODE = "LIGHT_DEV";
  context.after(() => {
    if (previousMode === undefined) {
      delete process.env.AUTH_EMAIL_DELIVERY_MODE;
      return;
    }

    process.env.AUTH_EMAIL_DELIVERY_MODE = previousMode;
  });

  const capture = await captureVerificationEmail(async () => {
    deliverVerificationEmail({
      recipientEmail: "learner@example.test",
      verificationUrl: "http://localhost:3000/api/auth/verify-email?token=one",
    });

    return "registration-created";
  });

  assert.deepEqual(capture, {
    success: true,
    value: "registration-created",
    verificationUrl: "http://localhost:3000/api/auth/verify-email?token=one",
  });
});

test("concurrent Light Dev auth operations cannot cross-capture links", async (context) => {
  const previousMode = process.env.AUTH_EMAIL_DELIVERY_MODE;
  process.env.AUTH_EMAIL_DELIVERY_MODE = "LIGHT_DEV";
  context.after(() => {
    if (previousMode === undefined) {
      delete process.env.AUTH_EMAIL_DELIVERY_MODE;
      return;
    }

    process.env.AUTH_EMAIL_DELIVERY_MODE = previousMode;
  });

  const [first, second] = await Promise.all([
    captureVerificationEmail(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      deliverVerificationEmail({
        recipientEmail: "first@example.test",
        verificationUrl: "http://localhost:3000/api/auth/verify-email?token=first",
      });
      return "first";
    }),
    captureVerificationEmail(async () => {
      deliverVerificationEmail({
        recipientEmail: "second@example.test",
        verificationUrl: "http://localhost:3000/api/auth/verify-email?token=second",
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "second";
    }),
  ]);

  assert.equal(
    first.success && first.verificationUrl?.endsWith("token=first"),
    true,
  );
  assert.equal(
    second.success && second.verificationUrl?.endsWith("token=second"),
    true,
  );
});
