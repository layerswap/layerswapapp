import { Address } from "@ton/core";
import { KnownInternalNames } from "@layerswap/widget/internal";
import { AddressUtilsProvider, Network } from "@layerswap/widget/types";

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