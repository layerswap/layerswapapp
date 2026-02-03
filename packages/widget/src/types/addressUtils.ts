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