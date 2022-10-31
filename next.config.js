const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')

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
      domains: ["bransferstorage.blob.core.windows.net", "devlslayerswapbridgesa.blob.core.windows.net"],
    },
    compiler: {
      removeConsole: false,
    },
    reactStrictMode: false
  }

  // TODO: Test the phases to see which corresponds to the prod only
  if (false) {
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

  return nextConfig;
};