import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
    '@layerswap/wallet-imtbl-x',
    '@layerswap/wallet-imtbl-passport',
    '@layerswap/wallet-module-zksync',
    '@layerswap/wallet-module-loopring',
    '@layerswap/wallets'
  ],
};

export default nextConfig;
