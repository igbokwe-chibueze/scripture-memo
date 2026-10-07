import { z } from "zod";

/**
 * Configures the shared Zod instance before application schemas are created.
 *
 * Zod 4 probes whether dynamic code generation is allowed and uses generated
 * validators as an optimization. A nonce-based Content Security Policy
 * correctly rejects that probe in browsers, which produces a report even
 * though Zod catches the exception and falls back to its interpreter. The
 * browser-only `jitless` setting skips the probe and keeps runtime validation
 * compatible with a strict script policy. Server validation retains Zod's
 * normal JIT behavior because it runs outside the browser CSP.
 *
 * All project code must import Zod from this module rather than directly from
 * the package so this setting is applied before each importing module builds
 * its schemas. It does not change schemas, validation rules, or error output.
 */
if (typeof window !== "undefined") {
  z.config({ jitless: true });
}

export { z };
