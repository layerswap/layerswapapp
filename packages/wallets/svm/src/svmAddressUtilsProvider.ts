import { PublicKey } from '@solana/web3.js'
import { Network, NetworkType, AddressUtilsProvider, AddressUtilsProviderProps } from "@layerswap/widget/types";
import { name } from "./constants";

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
            let pubkey = new PublicKey(address)
            let isSolana = PublicKey.isOnCurve(pubkey.toBuffer())
            return isSolana
        } catch (error) {
            return false
        }
    }

    addressFormat(props: AddressUtilsProviderProps): string {
        return props.address ?? '';
    }
}