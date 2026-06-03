import { Network, NetworkType, AddressUtilsProvider, AddressUtilsProviderProps } from "@layerswap/widget/types";
import { name } from "./constants";
import bs58 from 'bs58';

export class SolanaAddressUtilsProvider implements AddressUtilsProvider {
    readonly providerName = name;

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