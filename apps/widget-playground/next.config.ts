import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false }
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
  reactStrictMode: true,
  experimental: {
    // TypeScript 7 is the native compiler and ships no JS compiler API, so
    // Next has to shell out to `tsc` for the build's type-check step.
    useTypeScriptCli: true,
  },
};

export default nextConfig;
