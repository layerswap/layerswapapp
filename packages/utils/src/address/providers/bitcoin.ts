import { validate, Network as BtcNetwork } from 'bitcoin-address-validation';
import KnownInternalNames from "@/knownIds";
import { NetworkType, AddressSelectionMode, AddressUtilsProvider, AddressUtilsProviderProps } from "@/types";

export const name = 'Bitcoin';

export class BitcoinAddressUtilsProvider implements AddressUtilsProvider {
    readonly providerName = name;
    readonly networkType = NetworkType.Bitcoin;
    readonly label = 'Bitcoin';
    readonly selection = AddressSelectionMode.Auto;

    supportsNetwork(network: { name: string }): boolean {
        return KnownInternalNames.Networks.BitcoinMainnet.includes(network.name) || KnownInternalNames.Networks.BitcoinTestnet.includes(network.name)
    }

    isValidAddress(props: AddressUtilsProviderProps): boolean {
        const { address, network } = props;
        if (!address) {
            return false
        }
        // No network (classification path) → accept either, matching the old detector's network-agnostic validate.
        if (!network) {
            return validate(address, BtcNetwork.mainnet) || validate(address, BtcNetwork.testnet);
        }
        const isTestnet = network.name.toLowerCase().includes("testnet");
        return validate(address, isTestnet ? BtcNetwork.testnet : BtcNetwork.mainnet);
    }

    addressFormat(props: AddressUtilsProviderProps): string {
        return props.address;
    }
}
