import { useCallback } from 'react'
import { SwapPrerequisiteError } from '@layerswap/wallet-core'
import { useSwapDataUpdate } from '../context/swap'
import { useCheckSwapPrerequisites } from './useSwapPrerequisites'

/** Shared by every transfer and authorization; source-specific callers need no setup logic. */
export function useBeforeSwapExecution() {
    const { getExecutionPrerequisites } = useSwapDataUpdate()
    const checkPrerequisites = useCheckSwapPrerequisites()
    return useCallback(async (swapId?: string) => {
        try {
            await checkPrerequisites(getExecutionPrerequisites(swapId))
        } catch (error) {
            // Readiness, missing context, and cancellation are all pre-execution failures.
            // They must not be mistaken for a wallet or gasless-provider failure.
            if (error instanceof SwapPrerequisiteError) throw error
            throw new SwapPrerequisiteError([], error instanceof Error ? error.message : 'Could not verify account setup')
        }
    }, [getExecutionPrerequisites, checkPrerequisites])
}
