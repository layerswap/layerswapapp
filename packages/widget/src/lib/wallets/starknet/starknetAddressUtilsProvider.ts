import { validateAndParseAddress } from "./utils/starkNetAddressValidator";
import { Network } from "@/Models/Network";
import KnownInternalNames from "../../knownIds";
import { AddressUtilsProvider } from "@/types";

export class StarknetAddressUtilsProvider implements AddressUtilsProvider {
    supportsNetwork(network: Network): boolean {
        return (KnownInternalNames.Networks.StarkNetMainnet.includes(network.name) || KnownInternalNames.Networks.StarkNetGoerli.includes(network.name) || KnownInternalNames.Networks.StarkNetSepolia.includes(network.name))
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