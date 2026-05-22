import { createReactHookConnectionAdapter } from '@layerswap/widget/internal'
import { useBitcoinConnection } from './useBitcoinConnection'

export const bitcoinConnectionAdapter = createReactHookConnectionAdapter(useBitcoinConnection)
