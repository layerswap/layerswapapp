const { PHASE_PRODUCTION_SERVER } = require('next/constants');

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
const DOCS_URL = 'https://docs.layerswap.io/user-docs'
const redirects = async () => [
  {
    source: '/userguide',
    destination: DOCS_URL,
    permanent: true
  },
  {
    source: '/blog/guide/Privacy_Policy',
    destination: `${DOCS_URL}/information/privacy-policy`,
    permanent: true,
  },
  {
    source: '/blog/guide/Terms_of_Service',
    destination: `${DOCS_URL}/information/terms-of-services`,
    permanent: true,
  },
  {
    source: '/blog/guide/How_to_transfer_crypto_from_Binance_to_L2',
    destination: `${DOCS_URL}/your-first-swap/exchange-greater-than-network/transfer-from-binance`,
    permanent: true,
  },
  {
    source: '/blog/guide/How_to_transfer_crypto_from_Bitfinex_to_L2',
    destination: `${DOCS_URL}/your-first-swap/exchange-greater-than-network/transfer-from-bitfinex`,
    permanent: true,
  },
  {
    source: '/blog/guide/How_to_transfer_crypto_from_BITTREX_GLOBAL_to_L2',
    destination: `${DOCS_URL}/your-first-swap/exchange-greater-than-network/transfer-from-bittrex-global`,
    permanent: true,
  },
  {
    source: '/blog/guide/How_to_transfer_crypto_from_Coinbase_to_L2',
    destination: `${DOCS_URL}/your-first-swap/exchange-greater-than-network/transfer-from-coinbase`,
    permanent: true,
  },
  {
    source: '/blog/guide/How_to_transfer_crypto_from_cryptocom_to_L2',
    destination: `${DOCS_URL}/your-first-swap/exchange-greater-than-network/transfer-from-crypto.com`,
    permanent: true,
  },
  {
    source: '/blog/guide/How_to_transfer_crypto_from_Huobi_to_L2',
    destination: `${DOCS_URL}/your-first-swap/exchange-greater-than-network/transfer-from-huobi-global`,
    permanent: true,
  },
  {
    source: '/blog/guide/How_to_transfer_crypto_from_Kraken_to_L2',
    destination: `${DOCS_URL}/your-first-swap/exchange-greater-than-network/transfer-from-kraken`,
    permanent: true,
  },
  {
    source: '/blog/guide/How_to_transfer_crypto_from_KuCoin_to_L2',
    destination: `${DOCS_URL}/your-first-swap/exchange-greater-than-network/transfer-from-kucoin`,
    permanent: true,
  },
  {
    source: '/blog/guide/How_to_transfer_crypto_from_Okex_to_L2',
    destination: `${DOCS_URL}/your-first-swap/exchange-greater-than-network/transfer-from-okx`,
    permanent: true,
  },
]

module.exports = (phase, { defaultConfig }) => {
  /**
   * @type {import('next').NextConfig}
   */
  const nextConfig = {
    redirects,
    i18n: {
      locales: ["en"],
      defaultLocale: "en",
    },
    images: {
      domains: ["stagelslayerswapbridgesa.blob.core.windows.net", "bransferstorage.blob.core.windows.net", "devlslayerswapbridgesa.blob.core.windows.net", "prodlslayerswapbridgesa.blob.core.windows.net"],
    },
    compiler: {
      removeConsole: false,
    },
    reactStrictMode: false
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

  return nextConfig;
};