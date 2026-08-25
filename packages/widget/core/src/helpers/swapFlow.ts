import { Exchange } from "@/Models/Exchange";
import { SwapBasicData } from "@/lib/apiClients/layerSwapApiClient";

export type DepositMethod = 'wallet' | 'deposit_address' | undefined;

// The wallet method is the user's explicit choice to execute actions in this
// frontend. Keep every discovery/price/create request derived from this helper
// so virtual routes cannot drift between API calls.
export function shouldUseFrontendSwap(depositMethod: DepositMethod): boolean {
    return depositMethod === 'wallet';
}

// Deposit address (manual transfer) flow with no source exchange: amount is optional
// and min/max limits are not used for validation, so the limits fetch can be skipped.
export function isDepositAddressFlow(depositMethod: DepositMethod, fromExchange: Exchange | undefined): boolean {
    return depositMethod === 'deposit_address' && !fromExchange;
}

export function isDepositAddressSwap(swapData: Pick<SwapBasicData, 'use_deposit_address' | 'source_exchange'> | undefined): boolean {
    return !!swapData?.use_deposit_address && !swapData.source_exchange;
}
