import { useCallback } from 'react'
import { executeAtomicBatch } from '@/lib/atomicBatchExecution'
import { useBeforeSwapExecution } from './useBeforeSwapExecution'

/** Atomic submissions need the same account readiness guard as transfers and signatures. */
export function useAtomicBatch() {
    const beforeExecution = useBeforeSwapExecution()
    return useCallback(async (...args: Parameters<typeof executeAtomicBatch>) => {
        await beforeExecution(args[0].swapData.id)
        args[0].signal?.throwIfAborted()
        return executeAtomicBatch(...args)
    }, [beforeExecution])
}
