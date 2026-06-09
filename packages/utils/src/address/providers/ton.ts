import { Address } from "@ton/core";
import KnownInternalNames from "@/knownIds";
import { AddressUtilsProvider, AddressUtilsProviderProps, Network } from "@/types";

export const name = 'Ton';

export class TonAddressUtilsProvider implements AddressUtilsProvider {
    readonly providerName = name;

    supportsNetwork(network: Network): boolean {
        return KnownInternalNames.Networks.TONMainnet.includes(network.name) || KnownInternalNames.Networks.TONTestnet.includes(network.name)
    }

    isValidAddress(props: AddressUtilsProviderProps): boolean {
        const { address } = props;
        if (!address) {
            return false
        }
        try {
            return !!Address.parse(address).toString({ bounceable: false, testOnly: false, urlSafe: true })
        } catch (error) {
            return false
        }
    }

    addressFormat(props: AddressUtilsProviderProps): string {
        const { address } = props;
        if (!address) return '';
        try {
            return Address.parse(address).toString({ bounceable: false, testOnly: false, urlSafe: true })
        } catch (error) {
            return address
        }
    }
}
