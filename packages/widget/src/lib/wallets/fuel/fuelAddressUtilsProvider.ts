import { Network } from "@/Models/Network";
import KnownInternalNames from "@/lib/knownIds";
import { AddressUtilsProvider } from "@/types";

export class FuelAddressUtilsProvider implements AddressUtilsProvider {
    supportsNetwork(network: Network): boolean {
        return (KnownInternalNames.Networks.FuelMainnet.includes(network.name) || KnownInternalNames.Networks.FuelTestnet.includes(network.name))
    }

    isValidAddress(address?: string) {
        if (!address) {
            return false
        }
        const hexRegex = /^[0-9a-fA-F]+$/;

        if (address.startsWith("0x")) {
            address = address.slice(2); // Remove the "0x" prefix
        } else {
            return false;
        }
        return address.length === 64 && hexRegex.test(address);
    }
}