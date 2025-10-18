import KnownInternalNames from "@/lib/knownIds";
import { Network, NetworkType, AddressUtilsProvider } from "@/types"
import isValidEtherAddress from "./utils/isValidEtherAddress";

export class EVMAddressUtilsProvider implements AddressUtilsProvider {
    supportsNetwork(network: Network): boolean {
        return (network.type === NetworkType.EVM && !!network.token)
            || (KnownInternalNames.Networks.ZksyncMainnet.includes(network.name))
            || (KnownInternalNames.Networks.LoopringMainnet.includes(network.name) || KnownInternalNames.Networks.LoopringSepolia.includes(network.name))
            || (KnownInternalNames.Networks.ImmutableXMainnet || KnownInternalNames.Networks.ImmutableXSepolia).includes(network.name)
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

