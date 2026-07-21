import KnownInternalNames from "@/knownIds";
import { NetworkType, AddressSelectionMode, AddressUtilsProvider, AddressUtilsProviderProps, Network } from "@/types";

export const name = 'Ton';

/*
 * Minimal TON address codec, replacing `@ton/core`'s `Address` for the two
 * operations this provider needs (parse + normalize). Importing `@ton/core`
 * here pulled the whole @ton graph into the ROOT address-utils bundle — and
 * through it into every consumer's synchronous chunk (notably the CDN
 * remote) — for what is ~60 lines of well-specified parsing.
 *
 * Formats (see TEP-2 / ton-core `Address`):
 *  - raw:      "<workchain>:<64 hex chars>"
 *  - friendly: 48 chars of base64/base64url encoding 36 bytes:
 *              [tag(1), workchain(1, int8), hash(32), crc16-xmodem(2)]
 *              tag 0x11 = bounceable, 0x51 = non-bounceable, +0x80 = test-only
 */

const FLAG_BOUNCEABLE = 0x11
const FLAG_NON_BOUNCEABLE = 0x51
const FLAG_TEST_ONLY = 0x80

type ParsedTonAddress = { workchain: number; hash: Uint8Array }

/** CRC16/XMODEM (poly 0x1021, init 0) — the checksum TON friendly addresses use. */
function crc16(data: Uint8Array): number {
    let crc = 0
    for (const byte of data) {
        crc ^= byte << 8
        for (let i = 0; i < 8; i++) {
            crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
        }
    }
    return crc
}

function base64Decode(value: string): Uint8Array | null {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    try {
        if (typeof atob === 'function') {
            const bin = atob(normalized)
            const out = new Uint8Array(bin.length)
            for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
            return out
        }
        // Node without atob (SSR)
        return new Uint8Array(Buffer.from(normalized, 'base64'))
    } catch {
        return null
    }
}

function base64UrlEncode(bytes: Uint8Array): string {
    let bin = ''
    for (const b of bytes) bin += String.fromCharCode(b)
    const b64 = typeof btoa === 'function' ? btoa(bin) : Buffer.from(bytes).toString('base64')
    return b64.replace(/\+/g, '-').replace(/\//g, '_')
}

/** Parse raw ("wc:hex") or friendly (48-char base64) form; null when invalid. */
function parseTonAddress(address: string): ParsedTonAddress | null {
    const raw = /^(-?\d+):([0-9a-fA-F]{64})$/.exec(address)
    if (raw) {
        const workchain = parseInt(raw[1], 10)
        if (!Number.isInteger(workchain) || workchain < -128 || workchain > 127) return null
        const hash = new Uint8Array(32)
        for (let i = 0; i < 32; i++) hash[i] = parseInt(raw[2].slice(i * 2, i * 2 + 2), 16)
        return { workchain, hash }
    }

    if (!/^[A-Za-z0-9+/\-_]{48}$/.test(address)) return null
    const bytes = base64Decode(address)
    if (!bytes || bytes.length !== 36) return null

    const expectedCrc = (bytes[34] << 8) | bytes[35]
    if (crc16(bytes.subarray(0, 34)) !== expectedCrc) return null

    const tag = bytes[0] & ~FLAG_TEST_ONLY
    if (tag !== FLAG_BOUNCEABLE && tag !== FLAG_NON_BOUNCEABLE) return null

    const workchain = bytes[1] > 127 ? bytes[1] - 256 : bytes[1] // int8
    return { workchain, hash: bytes.subarray(2, 34) }
}

/** Canonical display form: friendly, non-bounceable, non-test, url-safe. */
function formatTonAddress({ workchain, hash }: ParsedTonAddress): string {
    const bytes = new Uint8Array(36)
    bytes[0] = FLAG_NON_BOUNCEABLE
    bytes[1] = workchain & 0xff
    bytes.set(hash, 2)
    const crc = crc16(bytes.subarray(0, 34))
    bytes[34] = crc >> 8
    bytes[35] = crc & 0xff
    return base64UrlEncode(bytes)
}

export class TonAddressUtilsProvider implements AddressUtilsProvider {
    readonly providerName = name;
    readonly networkType = NetworkType.TON;
    readonly label = 'TON';
    readonly selection = AddressSelectionMode.Auto;

    supportsNetwork(network: Network): boolean {
        return KnownInternalNames.Networks.TONMainnet.includes(network.name) || KnownInternalNames.Networks.TONTestnet.includes(network.name)
    }

    isValidAddress(props: AddressUtilsProviderProps): boolean {
        const { address } = props;
        if (!address) {
            return false
        }
        return parseTonAddress(address) !== null
    }

    addressFormat(props: AddressUtilsProviderProps): string {
        const { address } = props;
        if (!address) return '';
        const parsed = parseTonAddress(address)
        return parsed ? formatTonAddress(parsed) : address
    }
}
