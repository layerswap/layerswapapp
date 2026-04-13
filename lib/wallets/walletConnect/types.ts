export type WalletConnectMobile = {
    native?: string | null
    universal?: string | null
}

export type WalletConnectDesktop = {
    native?: string | null
    universal?: string | null
}

/**
 * Raw WalletConnect wallet shape resolved from `public/walletsData.json`.
 * Chain-agnostic — each chain decorates this with chain-specific fields
 * (e.g. wagmi's projectId/showQrModal/customStoragePrefix for EVM).
 */
export type WalletConnectWalletBase = {
    id: string
    name: string
    icon: string
    rdns?: string
    mobile: WalletConnectMobile
    desktop?: WalletConnectDesktop
    chains: string[]
    hasBrowserExtension: boolean
    installUrl?: string
    isMobileSupported: boolean
    order: number
    updatedAt?: string
}

export type DynamicWcMetadata = {
    name: string
    icon: string
    id: string
}

/**
 * Shared QR-modal state used by both EVM and Solana flows.
 * `loading` — waiting for the `display_uri` event from the WC provider.
 * `fetched` — URI received; `value` is the raw `wc:` URI (for the QR image),
 * `deepLink` is the wallet-specific mobile deep-link (for copy/redirect).
 */
export type QrCodeState =
    | { state: 'loading'; value: undefined; deepLink?: undefined }
    | { state: 'fetched'; value: string; deepLink?: string }

/**
 * Marker attached to UI connector tiles that originated from the WalletConnect
 * wallet registry (i.e. not a locally-installed adapter/connector). Both chains
 * use this to decide whether to route a connect through the QR / deep-link path.
 */
export const WC_REGISTRY_MARKER = Symbol('wcRegistry')

export type RegistryAttachedConnector<T> = T & {
    [WC_REGISTRY_MARKER]?: WalletConnectWalletBase
}

export const getRegistryEntry = (c: unknown): WalletConnectWalletBase | undefined => {
    if (!c || typeof c !== 'object') return undefined
    return (c as Record<symbol, WalletConnectWalletBase | undefined>)[WC_REGISTRY_MARKER]
}
