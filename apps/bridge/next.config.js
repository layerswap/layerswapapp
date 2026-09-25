const { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } = require('next/constants');

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const { resolveFaroRelease, resolveFaroDeployment } = require('./lib/faro-release.cjs');

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

const buildNextConfig = (phase, { defaultConfig = {} } = {}) => {
  const productionBuild = phase === PHASE_PRODUCTION_BUILD || phase === PHASE_PRODUCTION_SERVER;
  const faroRelease = resolveFaroRelease(process.env, productionBuild);
  const faroDeployment = resolveFaroDeployment(process.env, productionBuild);
  /**
   * @type {import('next').NextConfig}
   */

  const vercelEnvironment = process.env.VERCEL_ENV;
  const includeDevPages = vercelEnvironment
    ? vercelEnvironment === 'preview' || vercelEnvironment === 'development'
    : phase === PHASE_DEVELOPMENT_SERVER;
  const pageExtensions = defaultConfig.pageExtensions || ['tsx', 'ts', 'jsx', 'js'];

  const nextConfig = {
    // Preview deployments also use next build; VERCEL_ENV distinguishes them from production.
    pageExtensions: includeDevPages ? ['dev.mjs', ...pageExtensions] : pageExtensions,
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

module.exports = buildNextConfig;
