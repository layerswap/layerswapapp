import { AddressUtilsProvider } from "@/types";

export class AddressUtilsResolver {
    private providers: AddressUtilsProvider[];

    constructor(providers?: AddressUtilsProvider[]) {
        this.providers = providers || [];
    }

    isValidAddress(network: { name: string }, address?: string): boolean {
        const provider = this.providers.find(p => p.supportsNetwork(network));
        if (!provider) return false;

        return provider.isValidAddress(address, network);
    }

    addressFormat(address: string, network: { name: string }): string {
        const provider = this.providers.find(p => p.supportsNetwork(network));
        if (!provider) return address?.toLowerCase();

        return provider.addressFormat ? provider.addressFormat(address, network) : address?.toLowerCase();
    }
}
