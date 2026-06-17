export { default as KnownInternalNames } from "@/knownIds";

export type { AddressUtilsProvider, AddressUtilsProviderProps, Network } from "@/types";
export { NetworkType, AddressSelectionMode } from "@/types";
import { NetworkType } from "@/types";

export { AddressUtilsResolver } from "@/address/addressUtilsResolver";

export { EVMAddressUtilsProvider } from "@/address/providers/evm";
export { BitcoinAddressUtilsProvider } from "@/address/providers/bitcoin";
export { SolanaAddressUtilsProvider } from "@/address/providers/solana";
export { TonAddressUtilsProvider } from "@/address/providers/ton";
export { StarknetAddressUtilsProvider } from "@/address/providers/starknet";
export { TronAddressUtilsProvider } from "@/address/providers/tron";
export { FuelAddressUtilsProvider } from "@/address/providers/fuel";

import { AddressUtilsResolver } from "@/address/addressUtilsResolver";
import { EVMAddressUtilsProvider } from "@/address/providers/evm";
import { BitcoinAddressUtilsProvider } from "@/address/providers/bitcoin";
import { SolanaAddressUtilsProvider } from "@/address/providers/solana";
import { TonAddressUtilsProvider } from "@/address/providers/ton";
import { StarknetAddressUtilsProvider } from "@/address/providers/starknet";
import { TronAddressUtilsProvider } from "@/address/providers/tron";
import { FuelAddressUtilsProvider } from "@/address/providers/fuel";

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
// address validation/formatting/classification in the widget.
export const addressUtilsResolver = new AddressUtilsResolver(addressUtilsProviders);

// Address classification helpers, bound to the singleton resolver. Names match the
// widget consumers so adapting to the monorepo is just an import-source swap.
export const classifyAddress = (address: string) => addressUtilsResolver.classifyAddress(address);
export const AddressTypeLabel = (type: NetworkType) => addressUtilsResolver.addressTypeLabel(type);
export const AddressSelectionType = (type: NetworkType) => addressUtilsResolver.addressSelectionType(type);
export const defaultNetworkScope = (type: NetworkType, candidates: { name: string; type: NetworkType }[]) =>
    addressUtilsResolver.defaultNetworkScope(type, candidates);
