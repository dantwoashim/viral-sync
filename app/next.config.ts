import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16 uses Turbopack by default.
  // Privy Solana externals are handled at runtime, not build-time.
  turbopack: {},
};

export default nextConfig;
