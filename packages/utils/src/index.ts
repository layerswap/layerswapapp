export { default as KnownInternalNames } from "@/knownIds";
export {
    baseUnitsToNumber,
    bytesToHex,
    ceilUsd,
    checkStorageIsAvailable,
    classNames,
    floorUsd,
    formatUsd,
    getDateDifferenceString,
    groupBy,
    isDiffByPercent,
    isGuid,
    isInIframe,
} from '@/common'
export type { StorageType } from '@/common'

export type { AddressUtilsProvider, AddressUtilsProviderProps } from "@/types";
export { AddressSelectionMode } from "@/types";

export { AddressUtilsResolver } from "@/address/addressUtilsResolver";

export { EVMAddressUtilsProvider } from "@/address/providers/evm";
export { BitcoinAddressUtilsProvider } from "@/address/providers/bitcoin";
export { SolanaAddressUtilsProvider } from "@/address/providers/solana";
export { TonAddressUtilsProvider } from "@/address/providers/ton";
export { StarknetAddressUtilsProvider } from "@/address/providers/starknet";
export { TronAddressUtilsProvider } from "@/address/providers/tron";
export { FuelAddressUtilsProvider } from "@/address/providers/fuel";
export { StellarAddressUtilsProvider, isValidStellarAddress } from "@/address/providers/stellar";

export {
    addressUtilsProviders,
    addressUtilsResolver,
    classifyAddress,
    addressTypeLabel,
    addressSelectionType,
    defaultNetworkScope,
} from "@/address/instance";

export { Address, EmailAddress, isEmailAddress } from "@/address/Address";
export type { AddressDisplayFormat, AddressFormatOptions } from "@/address/Address";
export { isValidAddress } from "@/address/validator";
export { addressFormat } from "@/address/formatter";

export { isAndroid, isIOS, isMobile } from "@/isMobile";
export { default as sleep } from "@/sleep";

export { formatUnits } from "@/formatUnits";
export { retry, retryWithExponentialBackoff } from "@/retry";
export { fetchWithTimeout } from "@/fetchWithTimeout";
export { JsonRpcClient } from "@/jsonRpcClient";
export type { JsonRpcRequest, JsonRpcError, JsonRpcResponse } from "@/jsonRpcClient";
export { default as AppSettings } from "@/AppSettings";
