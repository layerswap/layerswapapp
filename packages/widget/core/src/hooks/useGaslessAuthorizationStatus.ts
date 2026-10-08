import useSWR from 'swr'
import type { ApiResponse } from '@layerswap/widget-types'
import LayerSwapApiClient, { type DepositAction, type GaslessAuthorizationResult } from '@/lib/apiClients/layerSwapApiClient'
import { isGaslessDepositWorkflow } from '@/helpers/gasless'
import { authorizationKey } from '@/helpers/swapKeys'

const apiClient = new LayerSwapApiClient()

// The provider owns this observation. Persisted client records never decide whether
// an authorization can be read again, including after a terminal response or reload.
export function useGaslessAuthorizationStatus(
    swapId: string | undefined,
    depositActions?: DepositAction[],
    observe: boolean | number = true,
    quoteRevision?: number,
    lookupWithoutActions = false,
) {
    const signingWorkflow = (lookupWithoutActions || depositActions?.some(action => action.step === 'sign' || action.type === 'sign'))
        && isGaslessDepositWorkflow(depositActions) !== false
    return useSWR<ApiResponse<GaslessAuthorizationResult>>(
        swapId && signingWorkflow ? authorizationKey(swapId, quoteRevision) : null,
        async () => {
            const response = await apiClient.GetGaslessAuthorizationAsync(swapId!)
            if (response.error) throw response.error
            if (!response.data?.status || !['initiated', 'published', 'completed', 'expired', 'insufficient', 'rejected'].includes(response.data.status)) {
                throw new Error('Could not check the authorization status.')
            }
            return response
        },
        {
            refreshInterval: typeof observe === 'number' ? observe : observe ? 4000 : 0,
            refreshWhenHidden: typeof observe === 'number' && observe <= 2000 && observe > 0,
            dedupingInterval: 1000,
            keepPreviousData: false,
            revalidateOnFocus: !!observe,
            revalidateOnReconnect: !!observe,
            // A pre-sign 404 can become an accepted authorization in another browser.
            shouldRetryOnError: !!observe,
            errorRetryInterval: 4000,
        },
    )
}
