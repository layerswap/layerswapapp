import type { NetworkRoute, Wallet } from '@layerswap/widget-types';
import type { AccountIdentity } from '@/context/swapAccounts';
import type { SwapBasicData } from '@/lib/apiClients/layerSwapApiClient';
import type { SwapFormValues } from '../Form/SwapFormValues';

export function withdrawalSelectionKey(networkName: string, account: AccountIdentity | undefined, wallet: Wallet | undefined): string {
    return JSON.stringify([
        networkName, account?.id, account?.address, account?.providerName, account?.provider?.name,
        wallet?.metadata?.evmConnectorUid, wallet?.metadata?.walletConnectTopic,
    ]);
}

export function walletWithdrawalValues(swap: SwapBasicData, refuel: boolean, amount = String(swap.requested_amount)): SwapFormValues {
    return {
        amountMode: swap.amountMode,
        amountPresetSource: swap.amountPresetSource,
        amount,
        from: swap.source_network as NetworkRoute,
        to: swap.destination_network as NetworkRoute,
        fromAsset: swap.source_token,
        toAsset: swap.destination_token,
        refuel,
        destination_address: swap.destination_address,
        depositMethod: 'wallet',
    };
}

