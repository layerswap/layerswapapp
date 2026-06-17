import bs58 from 'bs58';
import { NetworkType } from '@/Models/Network';
import { AddressSelectionMode, AddressValidator } from '../types';

export const solanaValidator: AddressValidator = {
    type: NetworkType.Solana,
    label: 'Solana',
    selection: AddressSelectionMode.Networks,
    defaultScope: 'primary',
    validate(address) {
        if (!address) return false;
        try {
            return bs58.decode(address).length === 32;
        } catch {
            return false;
        }
    },
};
