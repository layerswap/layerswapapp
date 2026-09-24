import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle the shared ESM packages, including their extensionless imports.
  transpilePackages: [
    '@layerswap/wallet-core',
    '@layerswap/ui-kit',
    '@layerswap/widget-types',
    '@layerswap/widget',
    '@layerswap/wallet-evm',
    '@layerswap/wallet-bitcoin',
    '@layerswap/wallet-fuel',
    '@layerswap/wallet-paradex',
    '@layerswap/wallet-starknet',
    '@layerswap/wallet-svm',
    '@layerswap/wallet-ton',
    '@layerswap/wallet-tron',
    '@layerswap/wallet-imtbl-passport',
    '@layerswap/wallet-module-loopring',
    '@layerswap/wallets',
    '@layerswap/utils',
  ],
};

export default nextConfig;
