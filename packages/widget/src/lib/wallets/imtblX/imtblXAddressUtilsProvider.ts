import { isValidEtherAddress } from "../utils"
import { Network } from "../../../Models/Network";
import KnownInternalNames from "../../knownIds";
import { AddressUtilsProvider } from "@/types";

export class ImmutableXAddressUtilsProvider implements AddressUtilsProvider {
    supportsNetwork(network: Network): boolean {
        return (KnownInternalNames.Networks.ImmutableXMainnet || KnownInternalNames.Networks.ImmutableXGoerli).includes(network.name)
    }

    isValidAddress(address?: string) {
        if (!address) {
            return false
        }
        return isValidEtherAddress(address);
    }
}

