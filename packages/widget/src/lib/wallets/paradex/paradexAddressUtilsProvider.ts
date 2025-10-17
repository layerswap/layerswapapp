import { BalanceProvider } from "@/types/balance";
import KnownInternalNames from "@/lib/knownIds";
import { AddressUtilsProvider } from "@/types";
import { isValidEtherAddress } from "../utils"

export class ParadexAddressUtilsProvider implements AddressUtilsProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return KnownInternalNames.Networks.ParadexMainnet.includes(network.name) || KnownInternalNames.Networks.ParadexTestnet.includes(network.name)
    }

    isValidAddress(address: string): boolean {
        return isValidEtherAddress(address)
    }
}
