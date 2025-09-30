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
    hostname: 'stagelslayerswapbridgesa.blob.core.windows.net',
  },
  {
    protocol: 'https',
    hostname: 'bransferstorage.blob.core.windows.net',
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
      remotePatterns: REMOTE_PATTERNS
    },
    compiler: {
      removeConsole: false,
    },
    reactStrictMode: true,
    webpack: config => {
      config.resolve.fallback = { fs: false, net: false, tls: false };
      return config;
    },
    productionBrowserSourceMaps: true,
    transpilePackages: ['@imtbl/sdk', '@fuels/connectors', '@fuels/react', "@radix-ui/react-dismissable-layer"]
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

  const wrapped = withPostHogConfig(nextConfig, {
    personalApiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    envId: process.env.NEXT_PUBLIC_POSTHOG_ID,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    sourcemaps: {
      enabled: true,
      version: process.env.VERCEL_GIT_COMMIT_SHA,
      deleteAfterUpload: true,
    },
  });

  wrapped.images = {
    ...(wrapped.images || {}),
    remotePatterns: [
      ...REMOTE_PATTERNS,
    ],
  };

  return wrapped;
}