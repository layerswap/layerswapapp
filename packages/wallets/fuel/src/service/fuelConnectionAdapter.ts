import { createReactHookConnectionAdapter } from '@layerswap/widget/internal'
import { useFuelConnection } from './useFuelConnection'

export const fuelConnectionAdapter = createReactHookConnectionAdapter(useFuelConnection)
