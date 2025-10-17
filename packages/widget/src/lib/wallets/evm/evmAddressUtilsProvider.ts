import KnownInternalNames from "@/lib/knownIds";
import { isValidEtherAddress } from "../utils";
import { Network, NetworkType, AddressUtilsProvider } from "@/types"

export class EVMAddressUtilsProvider implements AddressUtilsProvider {
    supportsNetwork(network: Network): boolean {
        return (network.type === NetworkType.EVM && !!network.token)
            || (KnownInternalNames.Networks.ZksyncMainnet.includes(network.name))
            || (KnownInternalNames.Networks.LoopringMainnet.includes(network.name) || KnownInternalNames.Networks.LoopringGoerli.includes(network.name))
    }

    isValidAddress(address?: string, network?: { name: string } | null) {
        if (!address) {
            return false
        }
        if (address?.startsWith("zksync:")) {
            return isValidEtherAddress(address.replace("zksync:", ""));
        }
        return isValidEtherAddress(address);
    }
}

