import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  cacheComponents: false,
  // Next.js 16 uses Turbopack by default.
  // Privy Solana externals are handled at runtime, not build-time.
  turbopack: {},
};

export default nextConfig;
