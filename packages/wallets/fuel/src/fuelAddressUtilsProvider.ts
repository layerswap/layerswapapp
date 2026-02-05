import { Network, AddressUtilsProvider, AddressUtilsProviderProps } from "@layerswap/widget/types";
import { KnownInternalNames } from "@layerswap/widget/internal";
import { name } from "./constants";

export class FuelAddressUtilsProvider implements AddressUtilsProvider {
    readonly providerName = name;

    supportsNetwork(network: Network): boolean {
        return (KnownInternalNames.Networks.FuelMainnet.includes(network.name) || KnownInternalNames.Networks.FuelTestnet.includes(network.name))
    }

    isValidAddress(props: AddressUtilsProviderProps): boolean {
        const { address } = props;
        if (!address) {
            return false
        }
        const hexRegex = /^[0-9a-fA-F]+$/;

        let addr = address;
        if (addr.startsWith("0x")) {
            addr = addr.slice(2); // Remove the "0x" prefix
        } else {
            return false;
        }
        return addr.length === 64 && hexRegex.test(addr);
    }
}