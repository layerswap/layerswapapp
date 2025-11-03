/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false }
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
  transpilePackages: ['@layerswap/widget', '@layerswap/wallet-evm', '@layerswap/wallet-imtbl-passport', '@layerswap/wallet-imtbl-x', '@layerswap/wallet-starknet', '@layerswap/wallet-svm', '@layerswap/wallet-bitcoin'],
  reactStrictMode: true,
}

module.exports = nextConfig
