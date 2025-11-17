import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    '@layerswap/widget',
    '@layerswap/wallet-evm',
    '@layerswap/wallet-bitcoin',
    '@layerswap/wallet-fuel',
    '@layerswap/wallet-paradex',
    '@layerswap/wallet-starknet',
    '@layerswap/wallet-svm',
    '@layerswap/wallet-ton',
    '@layerswap/wallet-tron',
  ],
};

export default nextConfig;
