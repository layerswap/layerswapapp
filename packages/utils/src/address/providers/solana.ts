import bs58 from 'bs58';
import { Network, NetworkType, AddressSelectionMode, AddressUtilsProvider, AddressUtilsProviderProps } from "@/types";

export const name = 'Solana';

export class SolanaAddressUtilsProvider implements AddressUtilsProvider {
    readonly providerName = name;
    readonly networkType = NetworkType.Solana;
    readonly label = 'Solana';
    readonly selection = AddressSelectionMode.Networks;
    readonly defaultScope = 'primary' as const;

    supportsNetwork(network: Network): boolean {
        return network.type === NetworkType.Solana
    }

    isValidAddress(props: AddressUtilsProviderProps): boolean {
        const { address } = props;
        if (!address) {
            return false
        }
        try {
            const decoded = bs58.decode(address);
            return decoded.length === 32;
        } catch {
            return false;
        }
    }

    addressFormat(props: AddressUtilsProviderProps): string {
        return props.address ?? '';
    }
}
