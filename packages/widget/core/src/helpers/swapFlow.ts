import { Exchange } from "@/Models/Exchange";
import { SwapBasicData } from "@/lib/apiClients/layerSwapApiClient";

export type DepositMethod = 'wallet' | 'deposit_address' | undefined;

type FrontendSwapOptions = {
    depositMethod: DepositMethod;
    sourceNetwork: string | undefined;
    destinationNetwork: string | undefined;
}

// Frontend execution is currently available only for same-network token swaps.
// Keep discovery, pricing, creation, and UI decisions derived from this helper
// so regular cross-network bridges never opt into the frontend swap flow.
export function shouldUseFrontendSwap({ depositMethod, sourceNetwork, destinationNetwork }: FrontendSwapOptions): boolean {
    return depositMethod === 'wallet'
        && !!sourceNetwork
        && sourceNetwork === destinationNetwork;
}

// Deposit address (manual transfer) flow with no source exchange: amount is optional
// and min/max limits are not used for validation, so the limits fetch can be skipped.
export function isDepositAddressFlow(depositMethod: DepositMethod, fromExchange: Exchange | undefined): boolean {
    return depositMethod === 'deposit_address' && !fromExchange;
}

export function isDepositAddressSwap(swapData: Pick<SwapBasicData, 'use_deposit_address' | 'source_exchange'> | undefined): boolean {
    return !!swapData?.use_deposit_address && !swapData.source_exchange;
}
