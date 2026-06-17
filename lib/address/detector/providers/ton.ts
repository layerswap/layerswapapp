import { Address } from '@ton/core';
import { NetworkType } from '@/Models/Network';
import { AddressSelectionMode, AddressValidator } from '../types';

export const tonValidator: AddressValidator = {
    type: NetworkType.TON,
    label: 'TON',
    selection: AddressSelectionMode.Auto,
    validate(address) {
        if (!address) return false;
        try {
            return !!Address.parse(address).toString({ bounceable: false, testOnly: false, urlSafe: true });
        } catch {
            return false;
        }
    },
};
