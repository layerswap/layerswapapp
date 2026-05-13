const { PHASE_PRODUCTION_SERVER, PHASE_PRODUCTION_BUILD } = require('next/constants');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
const FaroSourceMapUploaderPlugin = require('@grafana/faro-webpack-plugin');

const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'Content-Security-Policy',
    value: 'frame-ancestors *.immutable.com'
  },
]

const REMOTE_PATTERNS = [
  {
    protocol: 'https',
    hostname: 'cdn.layerswap.io',
  },
  {
    protocol: 'https',
    hostname: 'cdn.layerswap.cloud',
  },
  {
    protocol: 'https',
    hostname: 'devlslayerswapbridgesa.blob.core.windows.net',
  },
  {
    protocol: 'https',
    hostname: 'prodlslayerswapbridgesa.blob.core.windows.net',
  },
];

module.exports = (phase, { defaultConfig }) => {
  /**
   * @type {import('next').NextConfig}
   */

  const nextConfig = {
    i18n: {
      locales: ["en"],
      defaultLocale: "en",
    },
    images: {
      remotePatterns: REMOTE_PATTERNS,
      minimumCacheTTL: 3600
    },
    compiler: {
      removeConsole: false,
    },
    reactStrictMode: true,
    experimental: {
      optimizePackageImports: [
        'lucide-react',
        '@radix-ui/react-checkbox',
        '@radix-ui/react-popover',
        '@radix-ui/react-select',
        '@radix-ui/react-tabs',
        '@radix-ui/react-tooltip',
      ],
    },
    webpack: (config, { isServer }) => {
      config.resolve.fallback = { fs: false, net: false, tls: false };
      const faroSourcemapEndpoint = process.env.FARO_SOURCEMAP_ENDPOINT;
      const faroAppId = process.env.FARO_APP_ID;
      if (!isServer && phase === PHASE_PRODUCTION_BUILD && faroSourcemapEndpoint) {
        config.plugins.push(
          new FaroSourceMapUploaderPlugin({
            appName: 'layerswap-frontend',
            endpoint: faroSourcemapEndpoint,
            appId: faroAppId || 'layerswap-frontend',
            outputFiles: ['*.js'],
            bundleId: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || undefined,
            gzipContents: true,
          })
        );
      }
      return config;
    },
    productionBrowserSourceMaps: true,
    skipTrailingSlashRedirect: true,
    transpilePackages: ['@imtbl/sdk', '@fuels/connectors', '@fuels/react', "@radix-ui/react-dismissable-layer", "@solana/web3.js"]
  }
  if (process.env.APP_BASE_PATH) {
    nextConfig.basePath = process.env.APP_BASE_PATH
  }
  if (phase === PHASE_PRODUCTION_SERVER) {
    nextConfig.headers = async () => {
      return [
        {
          // Apply these headers to all routes in your application.
          source: '/:path*',
          headers: securityHeaders,
        },
      ]
    }
  }

  return withBundleAnalyzer(nextConfig)
}
