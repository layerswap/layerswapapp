import { getDefaultProviders } from "@layerswap/wallets";

export function buildDefaultWalletProviders() {
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

    return getDefaultProviders({
        walletConnect: walletConnectConfigs,
        immutablePassport: imtblPassportConfig,
        ton: {
            tonApiKey: process.env.NEXT_PUBLIC_TON_API_KEY || '',
            manifestUrl: 'https://layerswap.io/app/tonconnect-manifest.json',
        },
    });
}
