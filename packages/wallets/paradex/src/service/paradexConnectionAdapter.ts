import { createReactHookConnectionAdapter } from '@layerswap/widget/internal'
import { useParadexConnection } from './useParadexConnection'

export const paradexConnectionAdapter = createReactHookConnectionAdapter(useParadexConnection)
