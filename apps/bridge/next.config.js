const { PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } = require('next/constants');
const { withPostHogConfig } = require('@posthog/nextjs-config');
const FaroSourceMapUploaderPlugin = require('@grafana/faro-webpack-plugin');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const FARO_APP_NAME = 'layerswap-frontend';
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

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Content-Security-Policy', value: 'frame-ancestors *.immutable.com' },
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
  const faroBundleId = process.env.FARO_BUNDLE_ID || faroRelease;
  /**
   * @type {import('next').NextConfig}
   */

  const faroSourceMapConfig = {
    endpoint: process.env.FARO_SOURCEMAP_ENDPOINT,
    appId: process.env.FARO_SOURCEMAP_APP_ID || process.env.FARO_APP_ID,
    apiKey: process.env.FARO_SOURCEMAP_API_KEY || process.env.FARO_API_KEY,
    stackId: process.env.FARO_SOURCEMAP_STACK_ID || process.env.FARO_STACK_ID,
  };
  const missingFaroSourceMapVariables = [
    ['FARO_SOURCEMAP_ENDPOINT', faroSourceMapConfig.endpoint],
    ['FARO_SOURCEMAP_APP_ID (or FARO_APP_ID)', faroSourceMapConfig.appId],
    ['FARO_SOURCEMAP_API_KEY (or FARO_API_KEY)', faroSourceMapConfig.apiKey],
    ['FARO_SOURCEMAP_STACK_ID (or FARO_STACK_ID)', faroSourceMapConfig.stackId],
  ].filter(([, value]) => !value).map(([name]) => name);
  const sourceMapsConfigured = missingFaroSourceMapVariables.length === 0;
  const sourceMapsRequested = Object.values(faroSourceMapConfig).some(Boolean);

  if (
    phase === PHASE_PRODUCTION_BUILD
    && sourceMapsRequested
    && !sourceMapsConfigured
  ) {
    console.warn(
      `[Faro] Source-map upload is partially configured and disabled. Missing: ${missingFaroSourceMapVariables.join(', ')}`,
    );
  }

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
    webpack: (config, { isServer }) => {
      config.resolve.fallback = { fs: false, net: false, tls: false };

      if (!isServer && phase === PHASE_PRODUCTION_BUILD && sourceMapsConfigured) {
        config.plugins.push(new FaroSourceMapUploaderPlugin({
          appName: FARO_APP_NAME,
          endpoint: faroSourceMapConfig.endpoint.replace(/\/$/, ''),
          appId: faroSourceMapConfig.appId,
          apiKey: faroSourceMapConfig.apiKey,
          stackId: faroSourceMapConfig.stackId,
          bundleId: faroBundleId,
          gitHash:
            process.env.VERCEL_GIT_COMMIT_SHA
            || process.env.GITHUB_SHA
            || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
          outputFiles: /^static[\\/]chunks[\\/].*\.js\.map$/,
          recursive: true,
          nextjs: true,
          gzipContents: true,
          // The outer PostHog plugin runs after Faro and removes the maps. If
          // PostHog is absent, Faro removes them after a successful upload.
          keepSourcemaps: posthogConfigsAreSet,
          verbose: process.env.FARO_SOURCEMAP_DEBUG === 'true',
        }));
      }

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

// PostHog must remain the outer wrapper for its compiler/webpack hooks to run;
// the Faro plugin is installed by the inner webpack callback above.
module.exports = posthogConfigsAreSet
  ? withPostHogConfig(buildNextConfig, posthogOptions)
  : buildNextConfig;
