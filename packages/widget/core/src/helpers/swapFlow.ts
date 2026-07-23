import { Exchange } from "@/Models/Exchange";
import { SwapBasicData } from "@/lib/apiClients/layerSwapApiClient";

// Deposit address (manual transfer) flow with no source exchange: amount is optional
// and min/max limits are not used for validation, so the limits fetch can be skipped.
export function isDepositAddressFlow(depositMethod: 'wallet' | 'deposit_address' | undefined, fromExchange: Exchange | undefined): boolean {
    return depositMethod === 'deposit_address' && !fromExchange;
}

export function isDepositAddressSwap(swapData: Pick<SwapBasicData, 'use_deposit_address' | 'source_exchange'> | undefined): boolean {
    return !!swapData?.use_deposit_address && !swapData.source_exchange;
}
