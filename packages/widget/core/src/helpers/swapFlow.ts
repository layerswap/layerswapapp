import { Exchange } from "@/Models/Exchange";
import type { SwapBasicData, SwapExecution } from "@/lib/apiClients/layerSwapApiClient";

export type DepositMethod = 'wallet' | 'deposit_address' | undefined;

type FrontendSwapOptions = {
    depositMethod: DepositMethod;
    sourceNetwork: string | undefined;
    destinationNetwork: string | undefined;
}

// Frontend-swap support is always requested. The backend remains the authority that
// resolves the actual execution lane for the selected route and current capacity.
export function wantsFrontendSwap(_options: FrontendSwapOptions): true {
    return true;
}

export function isFrontendSwapExecution(execution: Pick<SwapExecution, 'type'> | undefined): boolean {
    return execution?.type === 'frontend_swap';
}

// Deposit address (manual transfer) flow with no source exchange: amount is optional
// and min/max limits are not used for validation, so the limits fetch can be skipped.
export function isDepositAddressFlow(depositMethod: DepositMethod, fromExchange: Exchange | undefined): boolean {
    return depositMethod === 'deposit_address' && !fromExchange;
}

export function isDepositAddressSwap(swapData: Pick<SwapBasicData, 'use_deposit_address' | 'source_exchange'> | undefined): boolean {
    return !!swapData?.use_deposit_address && !swapData.source_exchange;
}
