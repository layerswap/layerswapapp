import { validateAndParseAddress } from "./utils";
import { Network, AddressUtilsProvider, AddressUtilsProviderProps } from "@layerswap/widget/types";
import { KnownInternalNames } from "@layerswap/widget/internal";
import { name } from "./constants";

export class StarknetAddressUtilsProvider implements AddressUtilsProvider {
    readonly providerName = name;

    supportsNetwork(network: Network): boolean {
        return (KnownInternalNames.Networks.StarkNetMainnet.includes(network.name) || KnownInternalNames.Networks.StarkNetSepolia.includes(network.name))
            || (KnownInternalNames.Networks.ParadexMainnet.includes(network.name) || KnownInternalNames.Networks.ParadexTestnet.includes(network.name))
    }

    isValidAddress(props: AddressUtilsProviderProps): boolean {
        const { address } = props;
        if (!address) {
            return false
        }
        return validateAndParseAddress(address);
    }

    addressFormat(props: AddressUtilsProviderProps): string {
        const { address } = props;
        if (!address) return '';
        const removeHexPrefix = (hex: string) => {
            return hex?.replace("0x", "");
        }
        const addHexPrefix = (hex: string) => {
            return `0x${hex}`
        }
        const addAddressPadding = (addr: string) => {
            return addHexPrefix(removeHexPrefix(addr)?.padStart(64, '0'))
        }

        return addAddressPadding(address?.toLowerCase());
    }
}