export interface AddressUtilsProvider {
    supportsNetwork(network: { name: string }): boolean,
    isValidAddress: (address?: string, network?: { name: string } | null) => boolean,
    addressFormat?: (address: string, network: { name: string } | null) => string,
}
