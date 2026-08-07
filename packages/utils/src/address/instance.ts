import { AddressUtilsResolver } from "@/address/addressUtilsResolver";
import { EVMAddressUtilsProvider } from "@/address/providers/evm";
import { BitcoinAddressUtilsProvider } from "@/address/providers/bitcoin";
import { SolanaAddressUtilsProvider } from "@/address/providers/solana";
import { TonAddressUtilsProvider } from "@/address/providers/ton";
import { StarknetAddressUtilsProvider } from "@/address/providers/starknet";
import { TronAddressUtilsProvider } from "@/address/providers/tron";
import { FuelAddressUtilsProvider } from "@/address/providers/fuel";
import { NetworkType } from "@/types";

// All address utils providers, instantiated once.
export const addressUtilsProviders = [
    new EVMAddressUtilsProvider(),
    new BitcoinAddressUtilsProvider(),
    new SolanaAddressUtilsProvider(),
    new TonAddressUtilsProvider(),
    new StarknetAddressUtilsProvider(),
    new TronAddressUtilsProvider(),
    new FuelAddressUtilsProvider(),
];

// Singleton resolver wired with every provider — the canonical entry point for
// address validation/formatting/classification.
export const addressUtilsResolver = new AddressUtilsResolver(addressUtilsProviders);

export const classifyAddress = (address: string) => addressUtilsResolver.classifyAddress(address);
export const addressTypeLabel = (type: NetworkType) => addressUtilsResolver.addressTypeLabel(type);
export const addressSelectionType = (type: NetworkType) => addressUtilsResolver.addressSelectionType(type);
export const defaultNetworkScope = (type: NetworkType, candidates: { name: string; type: NetworkType }[]) =>
    addressUtilsResolver.defaultNetworkScope(type, candidates);
