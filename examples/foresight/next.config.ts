import type { NextConfig } from 'next';
import path from 'node:path';

// Temporary: render the locally built widget packages instead of the CDN loader.
// Run `pnpm build:packages` at the repo root first.
const repoRoot = path.join(__dirname, '../..');
// Turbopack resolves alias targets relative to this directory.
const local = (p: string) => `../../packages/${p}`;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: repoRoot,
    resolveAlias: {
      '@layerswap/widget/deposit': local('widget/core/dist/esm/exports/deposit.js'),
      '@layerswap/widget/index.css': local('widget/core/dist/index.css'),
      '@layerswap/wallets': local('wallets/all/dist/esm/index.js'),
    },
  },
  outputFileTracingRoot: repoRoot,
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
  experimental: { optimizePackageImports: ['lucide-react', '@privy-io/react-auth'] },
  basePath: process.env.APP_BASE_PATH || undefined,
};
export default nextConfig;
