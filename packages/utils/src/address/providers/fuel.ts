import { NetworkType } from '@layerswap/widget-types';
import { AddressSelectionMode, AddressUtilsProvider, AddressUtilsProviderProps } from "@/types";

export const name = 'Fuel';

export class FuelAddressUtilsProvider implements AddressUtilsProvider {
    readonly providerName = name;
    readonly networkType = NetworkType.Fuel;
    readonly label = 'Fuel';
    readonly selection = AddressSelectionMode.Auto;

    supportsNetwork(network: { name: string; type: string; token?: unknown }): boolean {
        return network.type === NetworkType.Fuel;
    }

    isValidAddress(props: AddressUtilsProviderProps): boolean {
        const { address } = props;
        if (!address) {
            return false
        }
        const hexRegex = /^[0-9a-fA-F]+$/;

        let addr = address;
        if (addr.startsWith("0x")) {
            addr = addr.slice(2); // Remove the "0x" prefix
        } else {
            return false;
        }
        return addr.length === 64 && hexRegex.test(addr);
    }
}
