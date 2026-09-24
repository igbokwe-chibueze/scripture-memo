import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { getDevelopmentHostnames } from "./lib/auth/development-origins";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // WHY: The framework-identification response header is unnecessary for the
  // application's behavior and gives remote scanners an avoidable version hint.
  poweredByHeader: false,
  // WHY: These response headers provide defense in depth across rendered pages
  // and public assets. A nonce-based Content-Security-Policy is intentionally
  // handled as a separate audit item because Next.js requires nonce-bearing
  // requests to render dynamically; that performance and compatibility impact
  // needs dedicated verification before enforcing a policy.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  // WHY: Next.js blocks HMR, fonts, and other development assets requested from
  // LAN hosts by default. Only explicitly configured development machines may
  // load them; this option has no production effect.
  allowedDevOrigins:
    process.env.NODE_ENV === "development"
      ? getDevelopmentHostnames()
      : [],
};

export default withNextIntl(nextConfig);
