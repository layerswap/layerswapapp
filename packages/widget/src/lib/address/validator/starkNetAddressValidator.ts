import BN from 'bn.js';

const TWO = toBN(2);
const MASK_251 = TWO.pow(toBN(251));
const MASK_221 = TWO.pow(toBN(221));

type BigNumberish = string | number | BN;

export function validateAndParseAddress(address: string): boolean {
    if (typeof address !== 'string') {
        return false;
    }

    if (!assertInRange(address, MASK_221, MASK_251)) {
        return false;
    }

    const result = addAddressPadding(address);

    if (!result.match(/^(0x)?[0-9a-fA-F]{64}$/)) {
        return false;
    }

    return true;
}

function addAddressPadding(address: string): string {
    return addHexPrefix(removeHexPrefix(address).padStart(64, '0'));
}

function addHexPrefix(hex: string): string {
    return `0x${removeHexPrefix(hex)}`;
}

function removeHexPrefix(hex: string): string {
    return hex.replace(/^0x/, '');
}

function assertInRange(
    input: BigNumberish,
    lowerBound: BigNumberish,
    upperBound: BigNumberish) {

    try {
        const inputBn = toBN(input);
        if (!inputBn.gte(toBN(lowerBound)) || !inputBn.lt(toBN(upperBound))) {
            return false;
        }
    }
    catch {
        return false;
    }

    return true;
}

function toBN(number: BigNumberish, base?: number | 'hex') {
    if (typeof number === 'string' && isHex(number) && !base)
        return new BN(removeHexPrefix(number), 'hex');
    return new BN(number, base);
}

function isHex(hex: string): boolean {
    return hex.startsWith('0x');
}