// This is a public, client-side-only project ID for WalletConnect wallet discovery.
// It has no authentication or authorization capability and is safe to expose in bundles.
export const WALLETCONNECT_PROJECT_ID =
    process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '28168903b2d30c75e5f7f2d71902581b'

export const WALLETCONNECT_METADATA = {
    name: 'Layerswap',
    description: 'Layerswap App',
    url: 'https://layerswap.io/app/',
    icons: ['https://www.layerswap.io/app/symbol.png'],
}
