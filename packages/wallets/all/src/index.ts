// Import all wallet provider factories and types
import { createBitcoinProvider } from "@layerswap/wallet-bitcoin";
import type { BitcoinProviderConfig } from "@layerswap/wallet-bitcoin";

import { createEVMProvider } from "@layerswap/wallet-evm";
import type { EVMProviderConfig, WalletConnectConfig } from "@layerswap/wallet-evm";

import { createFuelProvider } from "@layerswap/wallet-fuel";
import type { FuelProviderConfig } from "@layerswap/wallet-fuel";

import { createImmutablePassportProvider, ImtblRedirect } from "@layerswap/wallet-imtbl-passport";
import type { ImmutablePassportProviderConfig, ImtblPassportConfig } from "@layerswap/wallet-imtbl-passport";

import { createParadexProvider } from "@layerswap/wallet-paradex";
import type { ParadexProviderConfig } from "@layerswap/wallet-paradex";

import { createStarknetProvider } from "@layerswap/wallet-starknet";
import type { StarknetProviderConfig } from "@layerswap/wallet-starknet";

import { createSVMProvider } from "@layerswap/wallet-svm";
import type { SVMProviderConfig } from "@layerswap/wallet-svm";

import { createTONProvider } from "@layerswap/wallet-ton";
import type { TONProviderConfig, TonClientConfig } from "@layerswap/wallet-ton";

import { createTronProvider } from "@layerswap/wallet-tron";
import type { TronProviderConfig } from "@layerswap/wallet-tron";

import { WalletProvider, WalletWrapper } from "@layerswap/widget/types";

export { createBitcoinProvider };
export type { BitcoinProviderConfig };

export { createEVMProvider };
export type { EVMProviderConfig, WalletConnectConfig };

export { createFuelProvider };
export type { FuelProviderConfig };

export { createImmutablePassportProvider, ImtblRedirect };
export type { ImmutablePassportProviderConfig, ImtblPassportConfig };

export { createParadexProvider };
export type { ParadexProviderConfig };

export { createStarknetProvider };
export type { StarknetProviderConfig };

export { createSVMProvider };
export type { SVMProviderConfig };

export { createTONProvider };
export type { TONProviderConfig, TonClientConfig };

export { createTronProvider };
export type { TronProviderConfig };

/**
 * Configuration options for getDefaultProviders function
 */
export type DefaultWalletConfig = {
    walletConnect?: WalletConnectConfig
    ton?: TonClientConfig
    immutablePassport?: ImtblPassportConfig
}

/**
 * Creates and returns a default configuration of all wallet providers.
 *
 * @param config - Configuration options for the wallet providers
 * @returns Array of configured wallet providers ready to be passed to LayerswapProvider
 *
 * @example
 * ```tsx
 * import { getDefaultProviders } from "@layerswap/wallets";
 * import { LayerswapProvider, Swap } from "@layerswap/widget";
 *
 * const walletProviders = getDefaultProviders({
 *   walletConnect: {
 *     projectId: 'your-project-id',
 *     name: 'Your App',
 *     description: 'Your App Description',
 *     url: 'https://yourapp.com',
 *     icons: ['https://yourapp.com/icon.png']
 *   },
 *   ton: {
 *     tonApiKey: 'your-ton-api-key',
 *     manifestUrl: 'https://yourapp.com/tonconnect-manifest.json'
 *   }
 * });
 *
 * export default function App() {
 *   return (
 *     <LayerswapProvider walletProviders={walletProviders}>
 *       <Swap />
 *     </LayerswapProvider>
 *   );
 * }
 * ```
 */
export function getDefaultProviders(config: DefaultWalletConfig = {}) {
    const { walletConnect, ton, immutablePassport } = config;

    const providers: (WalletProvider | WalletWrapper)[] = [
        // EVM with modules
        createEVMProvider({
            walletConnectConfigs: walletConnect,
        }),
        // Starknet
        createStarknetProvider(),
        // Fuel
        createFuelProvider(),
        // Paradex
        createParadexProvider(),
        // Bitcoin
        createBitcoinProvider(),
        // TON
        ...(ton ? [createTONProvider({ tonConfigs: ton })] : []),
        // SVM (Solana)
        createSVMProvider({
            walletConnectConfigs: walletConnect
        }),
        // Tron
        createTronProvider(),
        // Immutable Passport (conditional)
        ...(immutablePassport ? [createImmutablePassportProvider({ imtblPassportConfig: immutablePassport })] : [])
    ];

    return providers;
}
