import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'export',
  // Keep Turbopack config explicit for local consistency.
  turbopack: {},
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      'jayson/lib/client/browser': path.resolve(__dirname, 'src/lib/jayson-browser-shim.ts'),
    };
    return config;
  },
};

export default nextConfig;
