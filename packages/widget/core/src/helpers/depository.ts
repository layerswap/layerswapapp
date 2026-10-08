import { NetworkType } from '@layerswap/widget-types'
import KnownInternalNames from '@layerswap/utils/known-ids'
import type { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues'
import { detectPocketUniverse } from '@/lib/pocketUniverse'

export function getDepositorySettings({ from, fromAsset, depositMethod, fromExchange }: Pick<SwapFormValues, 'from' | 'fromAsset' | 'depositMethod' | 'fromExchange'>, sourceIsSupported: boolean, sourceAddress?: string,) {
    const usePocketUniverseDepository = depositMethod === 'wallet' && !fromExchange && sourceIsSupported && !!sourceAddress
        && from?.type === NetworkType.EVM && !!fromAsset && fromAsset.symbol === from.token?.symbol && !fromAsset.contract && detectPocketUniverse()

    return { useDepository: from?.name === KnownInternalNames.Networks.StellarTestnet || from?.name === KnownInternalNames.Networks.StellarMainnet || usePocketUniverseDepository, disableGasless: usePocketUniverseDepository, }
}
