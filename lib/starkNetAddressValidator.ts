import BN from 'bn.js';
import{
    constants,
    getChecksumAddress,
    number,
    validateChecksumAddress,
    validateAndParseAddress,
  } from 'starknet';

type BigNumberish = string | number | BN;

export const normalizeAddress = (address: string) => getChecksumAddress(address)

export const formatTruncatedAddress = (address: string) => {
    const normalized = normalizeAddress(address)
    const hex = normalized.slice(0, 2)
    const start = normalized.slice(2, 6)
    const end = normalized.slice(-4)
    return `${hex}${start}…${end}`
  }

  export const formatFullAddress = (address: string) => {
    const normalized = normalizeAddress(address)
    const hex = normalized.slice(0, 2)
    const rest = normalized.slice(2)
    const parts = rest.match(/.{1,4}/g) || []
    return `${hex} ${parts.join(" ")}`
  }

export function validateAddress(address: string): boolean {
    if (typeof address !== 'string') {
        return false;
    }

    const result = addAddressPadding(address);

    if (!result.match(/^(0x)?[0-9a-fA-F]{64}$/)) {
        return false;
    }

    const parsedAddress = validateAndParseAddress(address)
    
    if (number.toBN(parsedAddress).eq(constants.ZERO)) {
        return false;
      }

      if (isChecksumAddress(address) && !validateChecksumAddress(address)) {
        return false
      }

    return true;
}

const isChecksumAddress = (address: string) => {
    if (/^0x[0-9a-f]{63,64}$/.test(address)) {
      return false
    }
    return true
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