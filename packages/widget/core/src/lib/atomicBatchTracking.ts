import type { AtomicBatchRecord } from '@/stores/atomicBatchStore'
import { resolveAtomicBatchOutcome } from '@/helpers/atomicBatch'

type TrackingHooks = {
    getStatus: (batch: AtomicBatchRecord) => Promise<unknown>
    getRecord: (swapId: string) => AtomicBatchRecord | undefined
    update: (batch: AtomicBatchRecord, update: Partial<AtomicBatchRecord>) => void | Promise<void>
    onConfirmed: (batch: AtomicBatchRecord, hash: string) => Promise<void>
}

/** One sequential poll per original wallet batch; errors never release its lock. */
export function trackAtomicBatch(initial: AtomicBatchRecord, hooks: TrackingHooks): () => void {
    let disposed = false
    let errors = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let requestTimeout: ReturnType<typeof setTimeout> | undefined
    const poll = async () => {
        if (disposed) return
        const batch = hooks.getRecord(initial.swapId)
        if (!batch || batch.attempt !== initial.attempt || batch.state === 'reconciled') return
        try {
            if (batch.state === 'confirmed' && batch.transactionHash) {
                await hooks.onConfirmed(batch, batch.transactionHash)
                return
            }
            if (!batch.id) return
            const result = await Promise.race([
                hooks.getStatus(batch),
                new Promise<never>((_, reject) => {
                    requestTimeout = setTimeout(() => reject(new Error('Batch status request timed out')), 30_000)
                }),
            ])
            clearTimeout(requestTimeout)
            if (disposed) return
            const current = hooks.getRecord(initial.swapId)
            if (!current || current.attempt !== batch.attempt || current.state === 'reconciled') return
            const outcome = resolveAtomicBatchOutcome(result, Number(batch.network.chain_id), batch.id)
            await hooks.update(batch, outcome.state === 'confirmed'
                ? { state: 'confirmed', transactionHash: outcome.hash } : { state: outcome.state })
            const updated = hooks.getRecord(initial.swapId)
            if (!updated || updated.attempt !== initial.attempt || updated.state === 'reconciled') return
            if (outcome.state === 'confirmed') {
                await hooks.onConfirmed(batch, outcome.hash)
                return
            }
            if (outcome.state === 'failed' || outcome.state === 'not_submitted') return
            errors = outcome.state === 'uncertain' ? errors + 1 : 0
        } catch {
            clearTimeout(requestTimeout)
            if (disposed) return
            errors++
            const current = hooks.getRecord(initial.swapId)
            if (current?.attempt === initial.attempt && current.state !== 'confirmed' && current.state !== 'reconciled') {
                try { await hooks.update(current, { state: 'uncertain' }) } catch {
                    // Recovery storage errors retain the existing submission lock.
                }
            }
        }
        if (!disposed) timer = setTimeout(poll, Math.min(30_000, 2000 * 2 ** Math.min(errors, 4)))
    }
    void poll()
    return () => { disposed = true; if (timer) clearTimeout(timer); if (requestTimeout) clearTimeout(requestTimeout) }
}
