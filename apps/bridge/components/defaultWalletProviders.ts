import { getDefaultProviders, preloadDefaultProviders } from "@layerswap/wallets";

export async function buildDefaultWalletProviders() {
    const imtblPassportConfig = typeof window !== 'undefined' ? {
        clientId: process.env.NEXT_PUBLIC_IMMUTABLE_CLIENT_ID || '',
        publishableKey: process.env.NEXT_PUBLIC_IMMUTABLE_PUBLISHABLE_KEY || '',
        redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/imtblRedirect` : '',
        logoutRedirectUri: typeof window !== 'undefined' ? `${window.location.origin}/` : '',
    } : undefined;

    const walletConnectConfigs = {
        projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
        name: 'Layerswap',
        description: 'Layerswap App',
        url: 'https://layerswap.io/app/',
        icons: ['https://www.layerswap.io/app/symbol.png'],
    };

    const providers = getDefaultProviders({
        walletConnect: walletConnectConfigs,
        immutablePassport: imtblPassportConfig,
        ton: {
            tonApiKey: process.env.NEXT_PUBLIC_TON_API_KEY || '',
            manifestUrl: 'https://layerswap.io/app/tonconnect-manifest.json',
        },
    });

    // Wait for every chain's lazy chunk to land before exposing the
    // providers array. With chunks in the module cache, React.lazy
    // resolves synchronously when WalletsProviders mounts the chain —
    // no Suspense fallback flash between empty and populated state.
    await preloadDefaultProviders();

    return providers;
}
