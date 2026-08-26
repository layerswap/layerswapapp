import { NetworkType, type Network } from '@layerswap/widget-types';
import KnownInternalNames from '@/knownIds';
import { AddressSelectionMode, type AddressUtilsProvider, type AddressUtilsProviderProps } from '@/types';
import { isValidStellarAddress } from '@/address/stellarAddress';

export { isValidStellarAddress } from '@/address/stellarAddress';

export const name = 'Stellar';

export class StellarAddressUtilsProvider implements AddressUtilsProvider {
    readonly providerName = name;
    readonly networkType = NetworkType.Stellar;
    readonly label = 'Stellar';
    readonly selection = AddressSelectionMode.Networks;
    readonly defaultScope = 'primary' as const;

    supportsNetwork(network: Network): boolean {
        return network.type === NetworkType.Stellar
            || KnownInternalNames.Networks.StellarMainnet === network.name
            || KnownInternalNames.Networks.StellarTestnet === network.name;
    }

    isValidAddress({ address }: AddressUtilsProviderProps): boolean {
        return !!address && isValidStellarAddress(address);
    }

    addressFormat({ address }: AddressUtilsProviderProps): string {
        return address.trim().toUpperCase();
    }
}
