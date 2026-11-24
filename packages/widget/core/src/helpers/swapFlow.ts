import { Exchange } from "@/Models/Exchange";
import type { SwapBasicData } from "@/lib/apiClients/layerSwapApiClient";
import { getExtendedProviderForNetwork } from "@/lib/extendedRoutes/registry";

export type DepositMethod = 'wallet' | 'deposit_address' | undefined;

type FrontendSwapOptions = {
    depositMethod: DepositMethod;
    sourceNetwork: string | undefined;
    destinationNetwork: string | undefined;
}

// Addressless provider deposits are sent by a provider account, not the connected
// wallet. Resolve this before the extended source is mapped to its real network.
export function isSentByConnectedWallet(sourceNetwork: string | undefined): boolean {
    return getExtendedProviderForNetwork(sourceNetwork)?.supportsFrontendSwap !== false;
}

export function wantsFrontendSwap({ sourceNetwork }: FrontendSwapOptions): boolean {
    return isSentByConnectedWallet(sourceNetwork);
}

// Deposit address (manual transfer) flow with no source exchange: amount is optional
// and min/max limits are not used for validation, so the limits fetch can be skipped.
export function isDepositAddressFlow(depositMethod: DepositMethod, fromExchange: Exchange | undefined): boolean {
    return depositMethod === 'deposit_address' && !fromExchange;
}

export function isDepositAddressSwap(swapData: Pick<SwapBasicData, 'use_deposit_address' | 'source_exchange'> | undefined): boolean {
    return !!swapData?.use_deposit_address && !swapData.source_exchange;
}
