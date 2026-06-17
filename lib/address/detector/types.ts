import { NetworkType } from '@/Models/Network';

export enum AddressSelectionMode {
    // Unambiguous — assign the type directly 
    Auto = 'auto',
    // One address spans many networks of this type — user picks networks
    Networks = 'networks',
    // Address format shared with other providers — user disambiguates the type (Starknet, Fuel)
    Overlap = 'overlap',
}

export interface AddressValidator {
    readonly type: NetworkType;
    readonly label: string;
    readonly selection: AddressSelectionMode;
    //For `Networks` mode: how the default network selection is seeded. Ignored for other selection modes.
    readonly defaultScope?: 'all' | 'primary';
    validate(address: string): boolean;
}
