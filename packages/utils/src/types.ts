export enum AddressSelectionMode {
    // Unambiguous — assign the type directly
    Auto = 'auto',
    // One address spans many networks of this type — user picks networks
    Networks = 'networks',
    // Address format shared with other providers — user disambiguates the type (Starknet, Fuel)
    Overlap = 'overlap',
}

export interface AddressUtilsProvider {
    providerName: string,
    supportsNetwork(network: { name: string }): boolean,
    isValidAddress: (props: AddressUtilsProviderProps) => boolean,
    addressFormat?: (props: AddressUtilsProviderProps) => string,
    // The network type this provider validates — used by address classification.
    networkType: NetworkType,
    // Human-readable label for the type (e.g. "EVM", "Starknet").
    label: string,
    // How a classified address of this type maps to a network scope.
    selection: AddressSelectionMode,
    // For `Networks` mode: how the default network selection is seeded. Ignored for other selection modes.
    defaultScope?: 'all' | 'primary',
}

export type AddressUtilsProviderProps = {
    address: string,
    network?: { name: string } | null,
    providerName?: string
}

// Minimal structural network shape needed by the address providers.
// The full Network model lives in @layerswap/widget; this keeps utils a leaf package.
export type Network = {
    name: string,
    type?: string,
    token?: unknown,
}

// Local copy of the network type values (mirrors Models/Network.ts in the widget).
// Kept here so utils does not depend on @layerswap/widget.
export enum NetworkType {
    EVM = "evm",
    Starknet = "starknet",
    Solana = "solana",
    Cosmos = "cosmos",
    StarkEx = "starkex",
    TON = 'ton',
    Fuel = 'fuel',
    Bitcoin = 'bitcoin',
    Tron = 'tron',
    Hyperliquid = 'hyperliquid'
}
