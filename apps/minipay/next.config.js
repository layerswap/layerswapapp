
module.exports = () => {
  /**
   * @type {import('next').NextConfig}
   */
  const nextConfig = {
    reactStrictMode: true,
    webpack: config => {
      config.resolve.fallback = { fs: false, net: false, tls: false };
      return config;
    },
    productionBrowserSourceMaps: true,
    transpilePackages: []
  }
  return nextConfig;
}