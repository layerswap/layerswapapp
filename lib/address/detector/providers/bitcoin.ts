import { validate } from 'bitcoin-address-validation';
import { NetworkType } from '@/Models/Network';
import { AddressSelectionMode, AddressValidator } from '../types';

export const bitcoinValidator: AddressValidator = {
    type: NetworkType.Bitcoin,
    label: 'Bitcoin',
    selection: AddressSelectionMode.Auto,
    validate: (address) => validate(address),
};
