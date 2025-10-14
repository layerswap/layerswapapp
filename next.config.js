import {
  PHASE_PRODUCTION_SERVER,
  PHASE_PRODUCTION_BUILD,
} from 'next/dist/shared/lib/constants.js'; // ✅ works in ESM
import { withPostHogConfig } from '@posthog/nextjs-config';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Content-Security-Policy', value: 'frame-ancestors *.immutable.com' },
];

const REMOTE_PATTERNS = [
  { protocol: 'https', hostname: 'stagelslayerswapbridgesa.blob.core.windows.net' },
  { protocol: 'https', hostname: 'bransferstorage.blob.core.windows.net' },
  { protocol: 'https', hostname: 'devlslayerswapbridgesa.blob.core.windows.net' },
  { protocol: 'https', hostname: 'prodlslayerswapbridgesa.blob.core.windows.net' },
];

const posthogOptions = {
  personalApiKey: process.env.POSTHOG_API_KEY,
  envId: process.env.POSTHOG_ENV_ID,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  sourcemaps: {
    enabled: true,
    project: 'Layerswap',
    version: process.env.VERCEL_GIT_COMMIT_SHA,
    deleteAfterUpload: true,
  },
};

function getConfig(phase) {
  const config = {
    i18n: { locales: ['en'], defaultLocale: 'en' },
    images: { remotePatterns: REMOTE_PATTERNS },
    compiler: { removeConsole: phase === PHASE_PRODUCTION_BUILD ? { exclude: ['error', 'warn'] } : false },
    reactStrictMode: true,
    webpack: (config) => {
      config.resolve.fallback = { fs: false, net: false, tls: false };
      return config;
    },
    productionBrowserSourceMaps: true,
    transpilePackages: ['@imtbl/sdk', '@fuels/connectors', '@fuels/react', '@radix-ui/react-dismissable-layer'],
  };

  if (process.env.APP_BASE_PATH) config.basePath = process.env.APP_BASE_PATH;

  if (phase === PHASE_PRODUCTION_SERVER) {
    config.headers = async () => [
      { source: '/:path*', headers: securityHeaders },
    ];
  }

  return config;
}


export default (phase, { defaultConfig }) =>
  withPostHogConfig(getConfig(phase), posthogOptions);
