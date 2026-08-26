const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const ED25519_PUBLIC_KEY_VERSION = 6 << 3;
const MUXED_ACCOUNT_VERSION = 12 << 3;

function decodeBase32(value: string): Uint8Array | undefined {
    let accumulator = 0;
    let bits = 0;
    const output: number[] = [];

    for (const char of value) {
        const digit = BASE32_ALPHABET.indexOf(char);
        if (digit === -1) return undefined;
        accumulator = (accumulator << 5) | digit;
        bits += 5;
        if (bits >= 8) {
            bits -= 8;
            output.push((accumulator >> bits) & 0xff);
            accumulator &= (1 << bits) - 1;
        }
    }

    if (bits > 0 && accumulator !== 0) return undefined;
    return Uint8Array.from(output);
}

/** CRC16/XMODEM; Stellar stores the resulting checksum little-endian. */
function crc16Xmodem(data: Uint8Array): number {
    let crc = 0;
    for (const byte of data) {
        crc ^= byte << 8;
        for (let bit = 0; bit < 8; bit++) {
            crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
        }
    }
    return crc;
}

/** Validate classic Stellar G-addresses and muxed M-addresses without the SDK. */
export function isValidStellarAddress(address: string): boolean {
    const normalized = address.trim().toUpperCase();
    if (!/^[A-Z2-7]+$/.test(normalized)) return false;

    const decoded = decodeBase32(normalized);
    if (!decoded) return false;

    const version = decoded[0];
    const expectedLength = version === ED25519_PUBLIC_KEY_VERSION
        ? 35
        : version === MUXED_ACCOUNT_VERSION
            ? 43
            : 0;
    if (!expectedLength || decoded.length !== expectedLength) return false;

    const payload = decoded.subarray(0, -2);
    const expectedChecksum = decoded[decoded.length - 2] | (decoded[decoded.length - 1] << 8);
    return crc16Xmodem(payload) === expectedChecksum;
}
