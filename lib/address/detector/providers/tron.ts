import { NetworkType } from '@/Models/Network';
import { AddressSelectionMode, AddressValidator } from '../types';

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE = 58;

/** Decode a Base58Check string to its hex payload (checksum stripped). */
function decodeBase58(base58Str: string): string {
    let num = 0n;
    for (const char of base58Str) {
        const charIndex = ALPHABET.indexOf(char);
        if (charIndex === -1) return '';
        num = num * BigInt(BASE) + BigInt(charIndex);
    }

    let hex = num.toString(16);
    if (hex.length % 2 !== 0) {
        hex = '0' + hex;
    }
    let bytes = Array.from(Buffer.from(hex, 'hex'));

    let leadingZeroes = 0;
    for (const char of base58Str) {
        if (char === '1') leadingZeroes++;
        else break;
    }
    bytes = new Array(leadingZeroes).fill(0).concat(bytes);

    if (bytes.length > 4) {
        bytes = bytes.slice(0, -4);
    }

    return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const tronValidator: AddressValidator = {
    type: NetworkType.Tron,
    label: 'Tron',
    selection: AddressSelectionMode.Auto,
    validate(address) {
        if (!address) return false;
        try {
            const decoded = decodeBase58(address).toUpperCase();
            return decoded.startsWith('41') && decoded.length === 42;
        } catch {
            return false;
        }
    },
};
