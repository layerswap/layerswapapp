import { KnownInternalNames } from "@layerswap/widget/internal";
import { Network, NetworkType, AddressUtilsProvider, AddressUtilsProviderProps } from "@layerswap/widget/types";
import isValidEtherAddress from "./evmUtils/isValidEtherAddress";
import { name } from "./constants";

export class EVMAddressUtilsProvider implements AddressUtilsProvider {
    readonly providerName = name;

    supportsNetwork(network: Network): boolean {
        return (network.type === NetworkType.EVM && !!network.token)
            || (KnownInternalNames.Networks.ZksyncMainnet.includes(network.name))
            || (KnownInternalNames.Networks.LoopringMainnet.includes(network.name) || KnownInternalNames.Networks.LoopringSepolia.includes(network.name))
            || (KnownInternalNames.Networks.ImmutableXMainnet).includes(network.name) || KnownInternalNames.Networks.ImmutableXSepolia.includes(network.name)
            || (KnownInternalNames.Networks.HyperliquidMainnet.includes(network.name) || KnownInternalNames.Networks.HyperliquidTestnet.includes(network.name))
    }

    isValidAddress(props: AddressUtilsProviderProps): boolean {
        const { address } = props;
        if (!address) {
            return false
        }
        if (address?.startsWith("zksync:")) {
            return isValidEtherAddress(address.replace("zksync:", ""));
        }
        return isValidEtherAddress(address);
    }

    addressFormat(props: AddressUtilsProviderProps): string {
        const { address } = props;
        return address.toLowerCase();
    }
}

