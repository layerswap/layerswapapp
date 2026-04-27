import decodeBase58 from "./utils";
import { Network, AddressUtilsProvider, AddressUtilsProviderProps } from "@layerswap/widget/types";
import { KnownInternalNames } from "@layerswap/widget/internal";
import { name } from "./constants";
export class TronAddressUtilsProvider implements AddressUtilsProvider {
    readonly providerName = name;

    supportsNetwork(network: Network): boolean {
        return KnownInternalNames.Networks.TronMainnet.includes(network.name) || KnownInternalNames.Networks.TronTestnet.includes(network.name)
    }

    isValidAddress(props: AddressUtilsProviderProps): boolean {
        const { address } = props;
        if (!address) {
            return false
        }
        const decodedAddress = decodeBase58(address).toUpperCase();
        return decodedAddress.startsWith('41') && decodedAddress.length == 42
    }

    addressFormat(props: AddressUtilsProviderProps): string {
        return props.address ?? '';
    }
}