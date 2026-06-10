export interface AddressUtilsProvider {
    providerName: string,
    supportsNetwork(network: { name: string }): boolean,
    isValidAddress: (props: AddressUtilsProviderProps) => boolean,
    addressFormat?: (props: AddressUtilsProviderProps) => string,
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
}
