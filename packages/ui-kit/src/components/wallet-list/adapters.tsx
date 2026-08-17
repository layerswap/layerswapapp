"use client"
import { createContext, useContext, useMemo, type ReactNode } from "react"
import { Address, shortenString } from "@layerswap/utils"
import type { Network, NetworkType, Token, Wallet } from "@layerswap/widget-types"
import type { WalletConnectionProvider } from "@layerswap/wallet-core/types"

export type WalletBalanceResult = {
    formatted?: string
    isLoading: boolean
}

export type AddressLabelResult = {
    name?: string
    labeled: string
}

export type SaveAddressRequest = {
    address: string
    networkType?: NetworkType
    supportedNetworks: string[]
}

export type RenderSaveFormProps = {
    address: string
    network: { name?: string; type: NetworkType }
    onDone: () => void
}

export type WalletListAdapters = {
    networks: Network[]
    connect: (provider?: WalletConnectionProvider, context?: { layout?: "overlay" | "standalone" }) => Promise<Wallet | undefined>
    getNetworkId: (network: Network) => string
    useWalletBalance: (args: { address?: string; network?: Network; token?: Token }) => WalletBalanceResult
    useAddressLabel: (address?: string | null, network?: { name: string } | null, providerName?: string) => AddressLabelResult
    renderSaveForm?: (props: RenderSaveFormProps) => ReactNode
}

const defaultUseWalletBalance = (): WalletBalanceResult => ({ formatted: undefined, isLoading: false })

const defaultUseAddressLabel = (address?: string | null, network?: { name: string } | null, providerName?: string): AddressLabelResult => {
    if (!address) return { name: undefined, labeled: '' }
    if (!network && !providerName) return { name: undefined, labeled: shortenString(address) }
    return { name: undefined, labeled: new Address(address, network ?? null, providerName!).toShortString() }
}

const defaultAdapters: WalletListAdapters = {
    networks: [],
    connect: async () => undefined,
    getNetworkId: (network) => network.name,
    useWalletBalance: defaultUseWalletBalance,
    useAddressLabel: defaultUseAddressLabel,
}

const WalletListAdaptersContext = createContext<WalletListAdapters>(defaultAdapters)

export function WalletListAdaptersProvider({ adapters, children }: { adapters: Partial<WalletListAdapters>; children: ReactNode }) {
    const value = useMemo(() => ({ ...defaultAdapters, ...adapters }), [adapters])
    return <WalletListAdaptersContext.Provider value={value}>{children}</WalletListAdaptersContext.Provider>
}

export function useWalletListAdapters() {
    return useContext(WalletListAdaptersContext)
}
