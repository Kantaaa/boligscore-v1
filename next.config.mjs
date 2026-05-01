import withPWAInit from "@ducanh2912/next-pwa";

/**
 * Build-time guard (auth-onboarding D6 / spec "Build-time prod guard"):
 * abort if /dev/login is somehow enabled in a production deploy. The
 * route already 404s at runtime when the env vars aren't both set, but
 * this stops the build from even succeeding so the URL is never live.
 */
if (
  process.env.VERCEL_ENV === "production" &&
  process.env.NEXT_PUBLIC_DEV_LOGIN_ENABLED === "1"
) {
  throw new Error(
    "[next.config] /dev/login MUST be disabled in production. Unset NEXT_PUBLIC_DEV_LOGIN_ENABLED before deploying.",
  );
}

const withPWA = withPWAInit({
  dest: "public",
  // Disable in development to avoid stale caches while iterating.
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
  },
};

export default withPWA(nextConfig);
