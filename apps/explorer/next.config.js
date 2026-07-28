/** @type {import('next').NextConfig} */

const REMOTE_PATTERNS = [
    { protocol: 'https', hostname: 'cdn.layerswap.io', },
    { protocol: 'https', hostname: 'cdn.layerswap.cloud', },
    { protocol: 'https', hostname: 'devlslayerswapbridgesa.blob.core.windows.net', },
    { protocol: 'https', hostname: 'prodlslayerswapbridgesa.blob.core.windows.net', },
]

const nextConfig = {
    reactStrictMode: true,
    images: {
        remotePatterns: REMOTE_PATTERNS,
    },
    transpilePackages: ['@layerswap/widget'],
}
if (process.env.NEXT_PUBLIC_APP_BASE_PATH) {
    nextConfig.basePath = process.env.NEXT_PUBLIC_APP_BASE_PATH
}
module.exports = nextConfig
