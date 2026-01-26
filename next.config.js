const { PHASE_PRODUCTION_SERVER } = require('next/constants');
const { withPostHogConfig } = require('@posthog/nextjs-config');

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

  const posthogWrapped = withPostHogConfig({}, {
    personalApiKey: process.env.POSTHOG_API_KEY,
    envId: process.env.POSTHOG_ENV_ID,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    sourcemaps: {
      enabled: true,
      project: 'Layerswap',
      version: process.env.VERCEL_GIT_COMMIT_SHA,
      deleteAfterUpload: true,
    },
  });

  const nextConfig = {
    i18n: {
      locales: ["en"],
      defaultLocale: "en",
    },
    images: {
      remotePatterns: REMOTE_PATTERNS
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
    webpack: config => {
      config.resolve.fallback = { fs: false, net: false, tls: false };
      return config;
    },
    productionBrowserSourceMaps: true,
    async rewrites() {
      return [
        {
          source: `/lsph/static/:path*`,
          destination: "https://us-assets.i.posthog.com/static/:path*",
        },
        {
          source: `/lsph/:path*`,
          destination: "https://us.i.posthog.com/:path*",
        },
      ];
    },
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
  let merged = { ...posthogWrapped, ...nextConfig };

  return merged
}