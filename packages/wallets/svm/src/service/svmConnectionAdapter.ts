import { createReactHookConnectionAdapter } from '@layerswap/widget/internal'
import { useSvmConnection } from './useSvmConnection'

export const svmConnectionAdapter = createReactHookConnectionAdapter(useSvmConnection)
