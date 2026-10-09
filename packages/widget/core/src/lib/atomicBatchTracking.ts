import type { AtomicBatchRecord } from '@/stores/atomicBatchStore'
import { resolveAtomicBatchOutcome, type BatchOutcome } from '@/helpers/atomicBatch'

type TrackingHooks = {
    getStatus: (batch: AtomicBatchRecord) => Promise<unknown>
    getRecord: (swapId: string) => AtomicBatchRecord | undefined
    onOutcome: (batch: AtomicBatchRecord, outcome: BatchOutcome) => void | Promise<void>
    onConfirmed: (batch: AtomicBatchRecord, hash: string) => Promise<void>
}

/** Poll the original request; outcomes are live observations and are never persisted. */
export function trackAtomicBatch(initial: AtomicBatchRecord, hooks: TrackingHooks): () => void {
    let disposed = false
    let errors = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let requestTimeout: ReturnType<typeof setTimeout> | undefined
    const poll = async () => {
        if (disposed) return
        const batch = hooks.getRecord(initial.swapId)
        if (!batch || batch.attempt !== initial.attempt || !batch.id) return
        try {
            const result = await Promise.race([
                hooks.getStatus(batch),
                new Promise<never>((_, reject) => {
                    requestTimeout = setTimeout(() => reject(new Error('Batch status request timed out')), 30_000)
                }),
            ])
            clearTimeout(requestTimeout)
            if (disposed || hooks.getRecord(initial.swapId)?.attempt !== initial.attempt) return
            const outcome = resolveAtomicBatchOutcome(result, Number(batch.network.chain_id), batch.id)
            await hooks.onOutcome(batch, outcome)
            if (disposed) return
            if (outcome.state === 'confirmed') {
                await hooks.onConfirmed(batch, outcome.hash)
                return
            }
            if (outcome.state === 'failed' || outcome.state === 'not_submitted') return
            errors = outcome.state === 'uncertain' ? errors + 1 : 0
        } catch {
            clearTimeout(requestTimeout)
            if (disposed || hooks.getRecord(initial.swapId)?.attempt !== initial.attempt) return
            errors++
            await hooks.onOutcome(batch, { state: 'uncertain' })
        }
        if (!disposed) timer = setTimeout(poll, Math.min(30_000, 2000 * 2 ** Math.min(errors, 4)))
    }
    void poll()
    return () => { disposed = true; clearTimeout(timer); clearTimeout(requestTimeout) }
}
