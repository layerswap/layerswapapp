import { AddressUtilsProvider } from '@/types';
import { validate, Network } from 'bitcoin-address-validation';
import KnownInternalNames from "../../knownIds";

export class BitcoinAddressUtilsProvider implements AddressUtilsProvider {
    supportsNetwork(network: { name: string }): boolean {
        return KnownInternalNames.Networks.BitcoinMainnet.includes(network.name) || KnownInternalNames.Networks.BitcoinTestnet.includes(network.name)
    }

    isValidAddress(address?: string, network?: { name: string } | null) {
        if (!address) {
            return false
        }
        const isTestnet = network?.name.toLowerCase().includes("testnet");
        return validate(address, isTestnet ? Network.testnet : Network.mainnet);
    }

    addressFormat(address: string) {
        return address;
    }
}