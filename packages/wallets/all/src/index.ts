// Import all wallet provider factories and types
import { createBitcoinProvider } from "@layerswap/wallet-bitcoin";
import type { BitcoinProviderConfig } from "@layerswap/wallet-bitcoin";

import { createEVMProvider } from "@layerswap/wallet-evm";
import type { EVMProviderConfig, WalletConnectConfig } from "@layerswap/wallet-evm";

import { createFuelProvider } from "@layerswap/wallet-fuel";
import type { FuelProviderConfig } from "@layerswap/wallet-fuel";

import { createImmutableXProvider } from "@layerswap/wallet-imtbl-x";
import type { ImmutableXProviderConfig } from "@layerswap/wallet-imtbl-x";

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

import { LoopringModule } from "@layerswap/wallet-module-loopring";
import { zkSyncModule } from "@layerswap/wallet-module-zksync";

// Re-export all wallet provider factories
export { createBitcoinProvider };
export type { BitcoinProviderConfig };

export { createEVMProvider };
export type { EVMProviderConfig, WalletConnectConfig };

export { createFuelProvider };
export type { FuelProviderConfig };

export { createImmutableXProvider };
export type { ImmutableXProviderConfig };

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

export { LoopringModule };
export { zkSyncModule };

// Re-export deprecated providers for backward compatibility
/**
 * @deprecated Use createBitcoinProvider() instead. This export will be removed in a future version.
 */
export { BitcoinProvider } from "@layerswap/wallet-bitcoin";

/**
 * @deprecated Use createEVMProvider() instead. This export will be removed in a future version.
 */
export { EVMProvider } from "@layerswap/wallet-evm";

/**
 * @deprecated Use createFuelProvider() instead. This export will be removed in a future version.
 */
export { FuelProvider } from "@layerswap/wallet-fuel";

/**
 * @deprecated Use createImmutableXProvider() instead. This export will be removed in a future version.
 */
export { ImmutableXProvider } from "@layerswap/wallet-imtbl-x";

/**
 * @deprecated Use createImmutablePassportProvider() instead. This export will be removed in a future version.
 */
export { ImtblPassportProvider } from "@layerswap/wallet-imtbl-passport";

/**
 * @deprecated Use createParadexProvider() instead. This export will be removed in a future version.
 */
export { ParadexProvider } from "@layerswap/wallet-paradex";

/**
 * @deprecated Use createStarknetProvider() instead. This export will be removed in a future version.
 */
export { StarknetProvider } from "@layerswap/wallet-starknet";

/**
 * @deprecated Use createSVMProvider() instead. This export will be removed in a future version.
 */
export { SVMProvider } from "@layerswap/wallet-svm";

/**
 * @deprecated Use createTONProvider() instead. This export will be removed in a future version.
 */
export { TONProvider } from "@layerswap/wallet-ton";

/**
 * @deprecated Use createTronProvider() instead. This export will be removed in a future version.
 */
export { TronProvider } from "@layerswap/wallet-tron";

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
 * This function provides a convenient way to instantiate all supported wallet providers
 * with a single function call. Providers are configured based on the options provided:
 *
 * - **EVM, Starknet, SVM**: Use WalletConnect configuration if provided, with fallback to undefined
 * - **TON**: Always included, uses provided configuration or undefined as fallback
 * - **Immutable Passport**: Included only if Immutable Passport configuration is provided
 * - **Bitcoin, Fuel, Tron, Paradex, ImmutableX**: Always included (no configuration required)
 * - **EVM**: Includes zkSyncModule and LoopringModule by default
 *
 * @param config - Configuration options for the wallet providers
 * @param config.walletConnect - Optional WalletConnect configuration (projectId, name, description, url, icons)
 * @param config.ton - Optional TON client configuration (tonApiKey, manifestUrl)
 * @param config.immutablePassport - Optional Immutable Passport configuration (publishableKey, clientId, redirectUri, logoutRedirectUri)
 *
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

    const providers = [
        // EVM with modules
        createEVMProvider({
            walletConnectConfigs: walletConnect,
            walletProviderModules: [LoopringModule, zkSyncModule]
        }),
        // Starknet
        createStarknetProvider({
            walletConnectConfigs: walletConnect
        }),
        // Fuel
        createFuelProvider(),
        // Paradex
        createParadexProvider(),
        // Bitcoin
        createBitcoinProvider(),
        // Immutable X
        createImmutableXProvider(),
        // TON (always included with optional config)
        createTONProvider(ton ? { tonConfigs: ton } : {}),
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
