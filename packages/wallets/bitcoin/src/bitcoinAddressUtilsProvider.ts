import { AddressUtilsProvider, AddressUtilsProviderProps } from '@layerswap/widget/types';
import { validate, Network } from 'bitcoin-address-validation';
import { KnownInternalNames } from "@layerswap/widget/internal";
import { name } from "./constants";

export class BitcoinAddressUtilsProvider implements AddressUtilsProvider {
    readonly providerName = name;

    supportsNetwork(network: { name: string }): boolean {
        return KnownInternalNames.Networks.BitcoinMainnet.includes(network.name) || KnownInternalNames.Networks.BitcoinTestnet.includes(network.name)
    }

    isValidAddress(props: AddressUtilsProviderProps): boolean {
        const { address, network } = props;
        if (!address) {
            return false
        }
        const isTestnet = network?.name.toLowerCase().includes("testnet");
        return validate(address, isTestnet ? Network.testnet : Network.mainnet);
    }

    addressFormat(props: AddressUtilsProviderProps): string {
        return props.address;
    }
}