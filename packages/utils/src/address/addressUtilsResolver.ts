import { AddressUtilsProvider, AddressUtilsProviderProps, NetworkType, AddressSelectionMode } from "@/types";

export class AddressUtilsResolver {
    private providers: AddressUtilsProvider[];

    constructor(providers?: AddressUtilsProvider[]) {
        this.providers = providers || [];
    }

    /** Which network type(s) a raw address string matches, and how its scope is picked.
     *  Multiple matches (e.g. Starknet + Fuel share 0x+64hex) collapse to `Overlap`. */
    classifyAddress(address: string): { types: NetworkType[]; selection: AddressSelectionMode | 'none' } {
        const a = (address ?? '').trim();
        const matched = a ? this.providers.filter(p => p.isValidAddress({ address: a })) : [];
        if (!matched.length) return { types: [], selection: 'none' };

        const types = matched.map(p => p.networkType);
        if (types.length > 1) return { types, selection: AddressSelectionMode.Overlap };
        return { types, selection: matched[0].selection };
    }

    addressTypeLabel(type: NetworkType): string {
        return this.providers.find(p => p.networkType === type)?.label ?? type;
    }

    addressSelectionType(type: NetworkType): AddressSelectionMode | undefined {
        return this.providers.find(p => p.networkType === type)?.selection;
    }

    /** Default selection for a `Networks`-mode address among `candidates` (already scoped to type/availability).
     *  `defaultScope: 'primary'` => the primary subset when present; otherwise all candidates. */
    defaultNetworkScope(type: NetworkType, candidates: { name: string; type: NetworkType }[]): string[] {
        if (this.providers.find(p => p.networkType === type)?.defaultScope === 'primary') {
            const typeName = String(type).toLowerCase();
            const primaries = candidates
                .filter(n => n.type === type && n.name.split('_')[0].toLowerCase() === typeName)
                .map(n => n.name);
            if (primaries.length) return primaries;
        }
        return candidates.map(n => n.name);
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
