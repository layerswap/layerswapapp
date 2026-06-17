import KnownInternalNames from "../../knownIds";
import { validate, Network } from 'bitcoin-address-validation';
import { evmValidator } from "@/lib/address/detector/providers/evm";
import { starknetValidator } from "@/lib/address/detector/providers/starknet";
import { solanaValidator } from "@/lib/address/detector/providers/solana";
import { tronValidator } from "@/lib/address/detector/providers/tron";
import { fuelValidator } from "@/lib/address/detector/providers/fuel";
import { tonValidator } from "@/lib/address/detector/providers/ton";

export function isValidAddress(address?: string, network?: { name: string } | null): boolean {
    if (!address || isBlacklistedAddress(address)) {
        return false
    }
    if (network?.name.toLowerCase().startsWith("ZKSYNC".toLowerCase())) {
        return evmValidator.validate(address.replace("zksync:", ""));
    }
    else if (network?.name.toLowerCase().startsWith("STARKNET".toLowerCase()) || network?.name.toLowerCase().startsWith("PARADEX".toLowerCase())) {
        return starknetValidator.validate(address);
    }
    else if (network?.name.toLowerCase().startsWith("BITCOIN".toLowerCase())) {
        const isTestnet = network?.name.toLowerCase().includes("testnet");
        return validate(address, isTestnet ? Network.testnet : Network.mainnet);
    }
    else if (network?.name.toLowerCase().startsWith("TON".toLowerCase())) {
        return tonValidator.validate(address);
    }
    else if (network?.name === KnownInternalNames.Networks.OsmosisMainnet) {
        return /^(osmo1)?[a-z0-9]{38}$/.test(address);
    }
    else if (network?.name.toLowerCase().startsWith("solana") || network?.name.toLowerCase().startsWith("eclipse") || network?.name.toLowerCase().startsWith("soon")) {
        return solanaValidator.validate(address);
    }
    else if (network?.name === KnownInternalNames.Networks.SorareStage) {
        return /^(0x)?[0-9a-f]{64}$/.test(address) || /^(0x)?[0-9A-F]{64}$/.test(address) || /^(0x)?[0-9a-f]{66}$/.test(address) || /^(0x)?[0-9A-F]{66}$/.test(address);
    }
    else if (network?.name === KnownInternalNames.Networks.TronMainnet || network?.name === KnownInternalNames.Networks.TronTestnet) {
        return tronValidator.validate(address);
    }
    else if (network?.name === KnownInternalNames.Networks.FuelTestnet || network?.name === KnownInternalNames.Networks.FuelMainnet) {
        return fuelValidator.validate(address);
    }
    else {
        return evmValidator.validate(address);
    }
}

function isBlacklistedAddress(address: string): boolean {

    const BlacklistedAddresses = [
        "0xa9d38c3FB49074c00596a25CcF396402362C92C5",
        "0x4d70500858f9705ddbd56d007d13bbc92c9c67d1"
    ]

    let account = address

    if (account.includes(":")) {
        account = account.split(":")[1]
    }

    if (BlacklistedAddresses.find(a => a.toLowerCase() === account.toLowerCase())) return true
    else return false
}