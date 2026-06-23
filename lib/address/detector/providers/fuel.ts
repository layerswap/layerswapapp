import { NetworkType } from '@/Models/Network';
import { AddressSelectionMode, AddressValidator } from '../types';

export const fuelValidator: AddressValidator = {
    type: NetworkType.Fuel,
    label: 'Fuel',
    selection: AddressSelectionMode.Auto,
    validate(address) {
        const hexRegex = /^[0-9a-fA-F]+$/;

        if (address.startsWith("0x")) {
            address = address.slice(2); // Remove the "0x" prefix
        } else {
            return false;
        }

        return address.length === 64 && hexRegex.test(address);
    },
};
