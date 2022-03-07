import { keccak256 } from "js-sha3";
import { CryptoNetwork } from "../Models/CryptoNetwork";
import { validateAndParseAddress } from "./starkNetAddressValidator";

export function isValidAddress(address: string, network: CryptoNetwork): boolean {
    if (network.code.toLowerCase() === "RONIN_MAINNET".toLowerCase()) {
        if (address.startsWith("ronin:")) {
            return isValidEtherAddress(address.replace("ronin:", "0x"));
        }
        return false;
    }
    else if (network.code.toLowerCase().startsWith("ZKSYNC".toLowerCase())) {
        if (address.startsWith("zksync:")) {
            return isValidEtherAddress(address.replace("zksync:", ""));
        }
        return isValidEtherAddress(address);
    }
    else if (network.code.toLowerCase().startsWith("STARKNET".toLowerCase()))
    {
        return validateAndParseAddress(address);
    }
    else {
        return isValidEtherAddress(address);
    }
}

function isValidEtherAddress(address: string): boolean {
    if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) {
        // check if it has the basic requirements of an address
        return false;
    } else if (/^(0x)?[0-9a-f]{40}$/.test(address) || /^(0x)?[0-9A-F]{40}$/.test(address)) {
        // If it's all small caps or all all caps, return true
        return true;
    } else {
        // Otherwise check each case
        return isChecksumAddress(address);
    }
}

function isChecksumAddress(address: string): boolean {
    // Check each case
    address = address.replace('0x', '');
    var addressHash = keccak256(address.toLowerCase());
    for (var i = 0; i < 40; i++) {
        // the nth letter should be uppercase if the nth digit of casemap is 1
        if ((parseInt(addressHash[i], 16) > 7 && address[i].toUpperCase() !== address[i]) || (parseInt(addressHash[i], 16) <= 7 && address[i].toLowerCase() !== address[i])) {
            return false;
        }
    }
    return true;
};