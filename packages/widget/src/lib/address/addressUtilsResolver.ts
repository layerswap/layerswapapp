import { AddressUtilsProvider, AddressUtilsProviderProps } from "@/types";

export class AddressUtilsResolver {
    private providers: AddressUtilsProvider[];

    constructor(providers?: AddressUtilsProvider[]) {
        this.providers = providers || [];
    }

    isValidAddress({ network, providerName, address }: AddressUtilsProviderProps): boolean {
        const provider = this.providers.find(p => network ? p.supportsNetwork(network) : providerName ? p.providerName === providerName : false);
        if (!provider) return false;

        return provider.isValidAddress({ address, network, providerName });
    }

    addressFormat({ address, network, providerName }: AddressUtilsProviderProps): string {
        const provider = this.providers.find(p => network ? p.supportsNetwork(network) : providerName ? p.providerName === providerName : false);
        if (!provider) return address;

        return provider.addressFormat ? provider.addressFormat({ address, network, providerName }) : address;
    }
}
