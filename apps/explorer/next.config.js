/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        domains: ['prodlslayerswapbridgesa.blob.core.windows.net', 'devlslayerswapbridgesa.blob.core.windows.net', 'cdn.layerswap.io', 'cdn.layerswap.cloud'],
    },
    transpilePackages: ['@layerswap/widget'],
}
if (process.env.NEXT_PUBLIC_APP_BASE_PATH) {
    nextConfig.basePath = process.env.NEXT_PUBLIC_APP_BASE_PATH
}
module.exports = nextConfig
