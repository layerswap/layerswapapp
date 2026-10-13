/** @type {import('next').NextConfig} */
const nextConfig = {
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
    '@layerswap/widget-types',
    '@layerswap/widget',
    '@layerswap/wallet-evm',
  ],
  reactStrictMode: true,
}

module.exports = nextConfig
