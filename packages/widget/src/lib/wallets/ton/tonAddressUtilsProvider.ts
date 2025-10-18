import { Address } from "@ton/core";
import { Network } from "../../../Models/Network";
import KnownInternalNames from "../../knownIds";
import { AddressUtilsProvider } from "@/types";

export class TonAddressUtilsProvider implements AddressUtilsProvider {
    supportsNetwork(network: Network): boolean {
        return KnownInternalNames.Networks.TONMainnet.includes(network.name) || KnownInternalNames.Networks.TONTestnet.includes(network.name)
    }

    isValidAddress(address?: string) {
        if (!address) {
            return false
        }
        try {
            return !!Address.parse(address).toString({ bounceable: false, testOnly: false, urlSafe: true })
        } catch (error) {
            return false
        }
    }

    addressFormat(address: string) {
        try {
            return Address.parse(address).toString({ bounceable: false, testOnly: false, urlSafe: true })
        } catch (error) {
            return address
        }
    }
}