import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
  experimental: { optimizePackageImports: ['lucide-react', '@privy-io/react-auth'] },
  basePath: process.env.APP_BASE_PATH || undefined,
};
export default nextConfig;
