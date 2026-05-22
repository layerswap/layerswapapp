import { createReactHookConnectionAdapter } from '@layerswap/widget/internal'
import { useTronConnection } from './useTronConnection'

export const tronConnectionAdapter = createReactHookConnectionAdapter(useTronConnection)
