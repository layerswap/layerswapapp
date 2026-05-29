// Import all wallet provider factories and types
//
// IMPORTANT: only `createEVMProvider`, `createImmutablePassportProvider`, and
// `imtblPassportLoginCallback` are value-imported eagerly from the chain
// packages. Every other chain is wired via a descriptor (see
// ./descriptors/*) so the chain SDK stays out of the host's entry chunk
// until the user actually opens the connect modal. Direct consumers can
// still `import { create<X>Provider } from "@layerswap/wallet-<chain>"`
// themselves if they want the eager path.

import type { BitcoinProviderConfig } from "@layerswap/wallet-bitcoin";
import { createBitcoinDescriptor } from "./descriptors/bitcoin";

import { createEVMProvider } from "@layerswap/wallet-evm";
import type { EVMProviderConfig, WalletConnectConfig } from "@layerswap/wallet-evm";

import type { FuelProviderConfig } from "@layerswap/wallet-fuel";
import { createFuelDescriptor } from "./descriptors/fuel";

import { createImmutablePassportProvider, imtblPassportLoginCallback } from "@layerswap/wallet-imtbl-passport";
import type { ImmutablePassportProviderConfig, ImtblPassportConfig } from "@layerswap/wallet-imtbl-passport";

import type { ParadexProviderConfig } from "@layerswap/wallet-paradex";
import { createParadexDescriptor } from "./descriptors/paradex";

import type { StarknetProviderConfig } from "@layerswap/wallet-starknet";
import { createStarknetDescriptor } from "./descriptors/starknet";

import type { SVMProviderConfig } from "@layerswap/wallet-svm";
import { createSVMDescriptor } from "./descriptors/svm";

import type { TONProviderConfig, TonClientConfig } from "@layerswap/wallet-ton";
import { createTONDescriptor } from "./descriptors/ton";

import type { TronProviderConfig } from "@layerswap/wallet-tron";
import { createTronDescriptor } from "./descriptors/tron";

import { WalletProvider, WalletProviderDescriptor, WalletWrapper } from "@layerswap/widget/types";

export { createBitcoinDescriptor };
export type { BitcoinProviderConfig };

export { createEVMProvider };
export type { EVMProviderConfig, WalletConnectConfig };

export { createFuelDescriptor };
export type { FuelProviderConfig };

export { createImmutablePassportProvider, imtblPassportLoginCallback };
export type { ImmutablePassportProviderConfig, ImtblPassportConfig };

export { createParadexDescriptor };
export type { ParadexProviderConfig };

export { createStarknetDescriptor };
export type { StarknetProviderConfig };

export { createSVMDescriptor };
export type { SVMProviderConfig };

export { createTONDescriptor };
export type { TONProviderConfig, TonClientConfig };

export { createTronDescriptor };
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
 * Only EVM (and Immutable Passport, when configured) is wired eagerly. Every
 * other chain ships as a `WalletProviderDescriptor` — the real SDK is
 * dynamic-imported on first connect-modal open. This keeps starknet,
 * @paradex/sdk, @ton/*, @tonconnect/sdk, @fuel-ts/*, @solana/web3.js,
 * tronweb (+ its transitive `validator`/`bignumber.js`), bitcoinjs-lib,
 * @bigmi, and the connector adapters out of the host's entry chunk.
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

    const providers: (WalletProvider | WalletWrapper | WalletProviderDescriptor)[] = [
        // EVM — eager (common case, kept on the initial bundle).
        createEVMProvider({
            walletConnectConfigs: walletConnect,
        }),
        // Starknet — lazy. Pulls starknet/starkware-crypto on connect.
        createStarknetDescriptor(),
        // Fuel — lazy. Pulls @fuel-ts/* + @fuels/vm-asm on connect.
        createFuelDescriptor(),
        // Paradex — lazy. Drags @paradex/sdk → starknet → starkware-crypto.
        createParadexDescriptor(),
        // Bitcoin — lazy. Pulls bitcoinjs-lib + @bigmi + bn.js + tweetnacl.
        createBitcoinDescriptor(),
        // TON — lazy and conditional (only included when tonConfigs supplied,
        // matching the prior eager behaviour).
        ...(ton ? [createTONDescriptor(ton)] : []),
        // SVM (Solana) — lazy. Pulls @solana/web3.js + SolanaWalletConnectAdapter.
        createSVMDescriptor(walletConnect),
        // Tron — lazy. Pulls tronweb + its transitive validator/bignumber/protobuf.
        createTronDescriptor(),
        // Immutable Passport — eager and conditional (its login callback
        // path is tied to the redirect page, so the SDK does need to be
        // present when the page renders).
        ...(immutablePassport ? [createImmutablePassportProvider({ imtblPassportConfig: immutablePassport })] : [])
    ];

    return providers;
}
