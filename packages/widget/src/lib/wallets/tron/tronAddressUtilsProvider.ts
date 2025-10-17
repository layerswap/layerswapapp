import decodeBase58 from "./utils";
import { Network } from "@/Models/Network";
import KnownInternalNames from "../../knownIds";
import { AddressUtilsProvider } from "@/types";

export class TronAddressUtilsProvider implements AddressUtilsProvider {
    supportsNetwork(network: Network): boolean {
        return KnownInternalNames.Networks.TronMainnet.includes(network.name)
    }

    isValidAddress(address?: string) {
        if (!address) {
            return false
        }
        const decodedAddress = decodeBase58(address).toUpperCase();
        return decodedAddress.startsWith('41') && decodedAddress.length == 42
    }

    addressFormat(address: string) {
        return address;
    }
}