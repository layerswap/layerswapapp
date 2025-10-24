import { validateAndParseAddress } from "./utils";
import { Network, AddressUtilsProvider } from "@layerswap/widget/types";
import { KnownInternalNames } from "@layerswap/widget/internal";

export class StarknetAddressUtilsProvider implements AddressUtilsProvider {
    supportsNetwork(network: Network): boolean {
        return (KnownInternalNames.Networks.StarkNetMainnet.includes(network.name) || KnownInternalNames.Networks.StarkNetSepolia.includes(network.name))
            || (KnownInternalNames.Networks.ParadexMainnet.includes(network.name) || KnownInternalNames.Networks.ParadexTestnet.includes(network.name))
    }

    isValidAddress(address?: string) {
        if (!address) {
            return false
        }
        return validateAndParseAddress(address);
    }

    addressFormat(address: string) {
        const removeHexPrefix = (hex: string) => {
            return hex?.replace("0x", "");
        }
        const addHexPrefix = (hex: string) => {
            return `0x${hex}`
        }
        const addAddressPadding = (address: string) => {
            return addHexPrefix(removeHexPrefix(address)?.padStart(64, '0'))
        }

        return addAddressPadding(address?.toLowerCase());
    }
}