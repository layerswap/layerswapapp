/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false }
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
  // Bundle the shared ESM packages, including their extensionless imports.
  transpilePackages: [
    '@layerswap/utils',
    '@layerswap/wallet-core',
    '@layerswap/ui-kit',
    '@layerswap/widget',
    '@layerswap/widget-types',
    '@layerswap/wallet-evm',
    '@layerswap/wallet-imtbl-passport',
    '@layerswap/wallet-imtbl-x',
    '@layerswap/wallet-starknet',
    '@layerswap/wallet-svm',
    '@layerswap/wallet-bitcoin',
  ],
  reactStrictMode: true,
}

module.exports = nextConfig
