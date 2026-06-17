import BN from 'bn.js';
import KnownInternalNames from "@/knownIds";
import { Network, NetworkType, AddressSelectionMode, AddressUtilsProvider, AddressUtilsProviderProps } from "@/types";

export const name = 'Starknet';

type BigNumberish = string | number | BN;

const TWO = toBN(2);
const MASK_251 = TWO.pow(toBN(251));
const MASK_221 = TWO.pow(toBN(221));

function removeHexPrefix(hex: string): string {
    return hex.replace(/^0x/, '');
}

function addHexPrefix(hex: string): string {
    return `0x${removeHexPrefix(hex)}`;
}

function addAddressPadding(address: string): string {
    return addHexPrefix(removeHexPrefix(address).padStart(64, '0'));
}

function isHex(hex: string): boolean {
    return hex.startsWith('0x');
}

function toBN(number: BigNumberish, base?: number | 'hex') {
    if (typeof number === 'string' && isHex(number) && !base) {
        return new BN(removeHexPrefix(number), 'hex');
    }
    return new BN(number, base);
}

function assertInRange(input: BigNumberish, lowerBound: BigNumberish, upperBound: BigNumberish): boolean {
    try {
        const inputBn = toBN(input);
        if (!inputBn.gte(toBN(lowerBound)) || !inputBn.lt(toBN(upperBound))) {
            return false;
        }
    } catch {
        return false;
    }
    return true;
}

/** Validates a Starknet address: value in range [2^221, 2^251) and 0x + 64 hex once padded. */
export function validateAndParseAddress(address: string): boolean {
    if (typeof address !== 'string') return false;
    if (!assertInRange(address, MASK_221, MASK_251)) return false;
    const result = addAddressPadding(address);
    return !!result.match(/^(0x)?[0-9a-fA-F]{64}$/);
}

export class StarknetAddressUtilsProvider implements AddressUtilsProvider {
    readonly providerName = name;
    readonly networkType = NetworkType.Starknet;
    readonly label = 'Starknet';
    readonly selection = AddressSelectionMode.Auto;

    supportsNetwork(network: Network): boolean {
        return (KnownInternalNames.Networks.StarkNetMainnet.includes(network.name) || KnownInternalNames.Networks.StarkNetSepolia.includes(network.name))
            || (KnownInternalNames.Networks.ParadexMainnet.includes(network.name) || KnownInternalNames.Networks.ParadexTestnet.includes(network.name))
    }

    isValidAddress(props: AddressUtilsProviderProps): boolean {
        const { address } = props;
        if (!address) {
            return false
        }
        return validateAndParseAddress(address);
    }

    addressFormat(props: AddressUtilsProviderProps): string {
        const { address } = props;
        if (!address) return '';
        return addAddressPadding(address.toLowerCase());
    }
}
