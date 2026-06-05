import { AddressValidator } from '../types';
import { evmValidator } from './evm';
import { starknetValidator } from './starknet';
import { fuelValidator } from './fuel';
import { solanaValidator } from './solana';
import { tronValidator } from './tron';
import { tonValidator } from './ton';
import { bitcoinValidator } from './bitcoin';

export const validators: AddressValidator[] = [
    evmValidator,
    starknetValidator,
    fuelValidator,
    solanaValidator,
    tronValidator,
    tonValidator,
    bitcoinValidator,
];
