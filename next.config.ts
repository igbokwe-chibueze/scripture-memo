import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { getDevelopmentHostnames } from "./lib/auth/development-origins";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // WHY: Next.js blocks HMR, fonts, and other development assets requested from
  // LAN hosts by default. Only explicitly configured development machines may
  // load them; this option has no production effect.
  allowedDevOrigins:
    process.env.NODE_ENV === "development"
      ? getDevelopmentHostnames()
      : [],
};

export default withNextIntl(nextConfig);
