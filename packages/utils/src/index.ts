export { default as KnownInternalNames } from "@/knownIds";

export type { AddressUtilsProvider, AddressUtilsProviderProps, Network } from "@/types";
export { NetworkType } from "@/types";

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
// address validation/formatting in the widget.
export const addressUtilsResolver = new AddressUtilsResolver(addressUtilsProviders);
