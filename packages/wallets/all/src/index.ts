// Re-export all wallet provider factories
export { createBitcoinProvider } from "@layerswap/wallet-bitcoin";
export type { BitcoinProviderConfig } from "@layerswap/wallet-bitcoin";

export { createEVMProvider } from "@layerswap/wallet-evm";
export type { EVMProviderConfig } from "@layerswap/wallet-evm";

export { createFuelProvider } from "@layerswap/wallet-fuel";
export type { FuelProviderConfig } from "@layerswap/wallet-fuel";

export { createImmutableXProvider } from "@layerswap/wallet-imtbl-x";
export type { ImmutableXProviderConfig } from "@layerswap/wallet-imtbl-x";

export { createImmutablePassportProvider, ImtblRedirect } from "@layerswap/wallet-imtbl-passport";
export type { ImmutablePassportProviderConfig } from "@layerswap/wallet-imtbl-passport";

export { createParadexProvider } from "@layerswap/wallet-paradex";
export type { ParadexProviderConfig } from "@layerswap/wallet-paradex";

export { createStarknetProvider } from "@layerswap/wallet-starknet";
export type { StarknetProviderConfig } from "@layerswap/wallet-starknet";

export { createSVMProvider } from "@layerswap/wallet-svm";
export type { SVMProviderConfig } from "@layerswap/wallet-svm";

export { createTONProvider } from "@layerswap/wallet-ton";
export type { TONProviderConfig } from "@layerswap/wallet-ton";

export { createTronProvider } from "@layerswap/wallet-tron";
export type { TronProviderConfig } from "@layerswap/wallet-tron";

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

