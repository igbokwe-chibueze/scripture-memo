/**
 * Checks the shared Resend auth-mail boundary without network access or email
 * delivery. These tests protect production configuration failures and ensure
 * links remain safe when inserted into the plain HTML message templates.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  createResendAuthEmailSender,
  escapeAuthEmailHtml,
} from "./resend-auth-email";

test("the common sender requires a Resend API key", (context) => {
  const previousApiKey = process.env.RESEND_API_KEY;
  const previousSender = process.env.RESEND_FROM_EMAIL;
  delete process.env.RESEND_API_KEY;
  process.env.RESEND_FROM_EMAIL = "Scripture Memo <auth@mail.scripturememo.com>";
  context.after(() => restoreEnvironment(previousApiKey, previousSender));

  assert.throws(
    () => createResendAuthEmailSender(),
    /RESEND_API_KEY is required/,
  );
});

test("the common sender requires a configured sender address", (context) => {
  const previousApiKey = process.env.RESEND_API_KEY;
  const previousSender = process.env.RESEND_FROM_EMAIL;
  process.env.RESEND_API_KEY = "re_local_test_key";
  delete process.env.RESEND_FROM_EMAIL;
  context.after(() => restoreEnvironment(previousApiKey, previousSender));

  assert.throws(
    () => createResendAuthEmailSender(),
    /RESEND_FROM_EMAIL is required/,
  );
});

test("HTML email values are escaped before link insertion", () => {
  assert.equal(
    escapeAuthEmailHtml(`https://example.test/?a=1&b=<script>"'`),
    "https://example.test/?a=1&amp;b=&lt;script&gt;&quot;&#39;",
  );
});

test("configured credentials create a sender without making a network request", (context) => {
  const previousApiKey = process.env.RESEND_API_KEY;
  const previousSender = process.env.RESEND_FROM_EMAIL;
  process.env.RESEND_API_KEY = "re_local_test_key";
  process.env.RESEND_FROM_EMAIL = "Scripture Memo <auth@mail.scripturememo.com>";
  context.after(() => restoreEnvironment(previousApiKey, previousSender));

  assert.equal(typeof createResendAuthEmailSender(), "function");
});

/** Restores pre-test secrets without printing them or retaining empty values. */
function restoreEnvironment(
  previousApiKey: string | undefined,
  previousSender: string | undefined,
): void {
  if (previousApiKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = previousApiKey;

  if (previousSender === undefined) delete process.env.RESEND_FROM_EMAIL;
  else process.env.RESEND_FROM_EMAIL = previousSender;
}
