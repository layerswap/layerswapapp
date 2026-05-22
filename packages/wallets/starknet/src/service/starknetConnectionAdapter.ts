import { createReactHookConnectionAdapter } from '@layerswap/widget/internal'
import useStarknetConnection from '../useStarknetConnection'

export const starknetConnectionAdapter = createReactHookConnectionAdapter(useStarknetConnection)
