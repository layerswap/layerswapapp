import KnownInternalNames from '@layerswap/utils/known-ids'
import type { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues'

export function shouldUseDepository({ from }: Pick<SwapFormValues, 'from'>) {
    return from?.name === KnownInternalNames.Networks.StellarTestnet || from?.name === KnownInternalNames.Networks.StellarMainnet
}
