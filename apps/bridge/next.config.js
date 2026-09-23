const { PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } = require('next/constants');
const { withPostHogConfig } = require('@posthog/nextjs-config');

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const { resolveFaroRelease, resolveFaroDeployment } = require('./lib/faro-release.cjs');

const posthogConfigsAreSet = Boolean(
  process.env.POSTHOG_PROJECT_ID
  && process.env.POSTHOG_API_KEY
  && process.env.NEXT_PUBLIC_POSTHOG_HOST
);

const posthogOptions = {
  personalApiKey: process.env.POSTHOG_API_KEY,
  projectId: process.env.POSTHOG_PROJECT_ID,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  sourcemaps: {
    enabled: true,
    project: 'Layerswap',
    deleteAfterUpload: true,
  },
};

// Framing policy (Content-Security-Policy: frame-ancestors / X-Frame-Options) is
// intentionally absent. The 2022 values were never served (the phase gate was dead
// config) and the bridge is iframed by partners (settings.isEmbedded, NoCookies).
// Do not add framing headers here; see follow-up "env-driven security headers":
// lib/security-headers.cjs + partner-embedder allowlist.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
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
  {
    protocol: 'https',
    hostname: 'layerswap.io',
  },
];

const buildNextConfig = (phase) => {
  const productionBuild = phase === PHASE_PRODUCTION_BUILD || phase === PHASE_PRODUCTION_SERVER;
  const faroRelease = resolveFaroRelease(process.env, productionBuild);
  const faroDeployment = resolveFaroDeployment(process.env, productionBuild);
  /**
   * @type {import('next').NextConfig}
   */

  const nextConfig = {
    env: {
      NEXT_PUBLIC_FARO_RELEASE: faroRelease,
      NEXT_PUBLIC_FARO_DEPLOYMENT: faroDeployment,
    },
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
        {
          source: `/.well-known/vercel/flags`,
          destination: `/api/vercel/flags`,
        },
      ];
    },
    skipTrailingSlashRedirect: true,
    transpilePackages: ['@imtbl/auth', '@imtbl/wallet', '@imtbl/metrics', '@imtbl/generated-clients', '@fuels/connectors', '@fuels/react', "@radix-ui/react-dismissable-layer", "@solana/web3.js"]
  }
  if (process.env.APP_BASE_PATH) {
    nextConfig.basePath = process.env.APP_BASE_PATH
  }
  // Route headers are recorded into the routes manifest by `next build` and loaded
  // from next.config.js by `next dev`; keep them phase-independent.
  nextConfig.headers = async () => [{ source: '/:path*', headers: securityHeaders }]
  return withBundleAnalyzer(nextConfig)
}

// PostHog must remain the outer wrapper for its compiler/webpack hooks to run.
module.exports = posthogConfigsAreSet
  ? withPostHogConfig(buildNextConfig, posthogOptions)
  : buildNextConfig;
