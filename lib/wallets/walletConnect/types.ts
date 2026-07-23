import { NetworkType } from "@/Models/Network"

export type WalletConnectLink = {
    native?: string | null
    universal?: string | null
}

/**
 * Raw WalletConnect wallet shape resolved from the Web3Modal getWallets API.
 * Chain-agnostic — each chain decorates this with chain-specific fields
 * (e.g. wagmi's projectId/showQrModal/customStoragePrefix for EVM).
 */
export type WalletConnectWalletBase = {
    id: string
    name: string
    icon: string
    rdns?: string
    mobile: WalletConnectLink
    desktop?: WalletConnectLink
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

const CAIP_NAMESPACE_TO_NETWORK_TYPE: Record<string, NetworkType> = {
    eip155: NetworkType.EVM,
    solana: NetworkType.Solana,
}

export const chainsToNetworkTypes = (chains: string[] | undefined): NetworkType[] => {
    const types = new Set<NetworkType>()
    for (const chain of chains ?? []) {
        const networkType = CAIP_NAMESPACE_TO_NETWORK_TYPE[chain.split(':')[0]]
        if (networkType) types.add(networkType)
    }
    return [...types]
}
