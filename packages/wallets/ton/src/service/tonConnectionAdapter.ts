import { createReactHookConnectionAdapter } from '@layerswap/widget/internal'
import { useTonConnection } from './useTonConnection'

export const tonConnectionAdapter = createReactHookConnectionAdapter(useTonConnection)
