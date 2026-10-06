import { useEffect, useRef } from 'react'
import type { SwapLifecycleEvent } from '@layerswap/widget-types'
import LayerSwapApiClient, { BackendTransactionStatus, TransactionType, type SwapDetails } from '@/lib/apiClients/layerSwapApiClient'
import { getExplorerUrl } from '@/lib/address/explorerUrl'
import { resolverService } from '@/lib/resolvers/resolverService'
import { trackAtomicBatch } from '@/lib/atomicBatchTracking'
import { useAtomicBatchStore, isBatchOutstanding, subscribeAtomicBatchStorage, type AtomicBatchRecord } from '@/stores/atomicBatchStore'
import { useSwapTransactionStore } from '@/stores/swapTransactionStore'
import { isTransactionHash } from '@/helpers/atomicBatch'
import { useClientLayoutEffect } from './useClientLayoutEffect'

export function useAtomicBatchTracking(swapDetails: SwapDetails | undefined, onLifecycle: (event: SwapLifecycleEvent) => void) {
    const emit = useRef(onLifecycle)
    useClientLayoutEffect(() => { emit.current = onLifecycle }, [onLifecycle])
    useEffect(() => {
        const api = new LayerSwapApiClient()
        const running = new Map<string, () => void>()
        const confirm = async (batch: AtomicBatchRecord, hash: string) => {
            if (!isTransactionHash(hash)) throw new Error('Invalid batch receipt hash')
            const transactions = useSwapTransactionStore.getState()
            if (!transactions.swapTransactions[batch.swapId]?.hash) {
                transactions.setSwapTransaction(batch.swapId, BackendTransactionStatus.Pending, hash)
                transactions.setStepTransaction(batch.swapId, 'publish', hash, getExplorerUrl(batch.network.transaction_explorer_template, hash))
                emit.current({ step: 'transaction_submitted', stage: 'input_transfer', outcome: 'succeeded',
                    path: 'AtomicBatchTracking', action: 'approve_and_swap', swapId: batch.swapId,
                    transactionHash: hash, fromAddress: batch.account, sourceNetwork: batch.network.name, provider: batch.wallet.providerName })
            }
            await api.SwapCatchup(batch.swapId, hash)
            await useAtomicBatchStore.getState().update(batch.swapId, batch.attempt, { catchupComplete: true })
        }
        const synchronize = () => {
            const records = Object.values(useAtomicBatchStore.getState().batches)
            const active = records.filter(batch => (isBatchOutstanding(batch) && batch.id)
                || (batch.state === 'confirmed' && !batch.catchupComplete))
            const keys = new Set(active.map(batch => batch.attempt))
            for (const [key, stop] of running) {
                if (!keys.has(key)) { stop(); running.delete(key) }
            }
            for (const batch of active) {
                if (running.has(batch.attempt)) continue
                // Defer first poll so subscription callbacks can't create duplicate runners.
                let stop: (() => void) | undefined
                const timer = setTimeout(() => {
                    stop = trackAtomicBatch(batch, {
                        getRecord: id => useAtomicBatchStore.getState().batches[id],
                        update: (record, update) => useAtomicBatchStore.getState().update(record.swapId, record.attempt, update),
                        getStatus: record => {
                            const provider = resolverService.getTransferResolver().getAtomicBatchProvider(record.network)
                            if (!provider) throw new Error('Reconnect the original wallet')
                            return provider.getStatus({ network: record.network, wallet: record.wallet, account: record.account }, record.id!)
                        },
                        onConfirmed: confirm,
                    })
                }, 0)
                running.set(batch.attempt, () => { clearTimeout(timer); stop?.() })
            }
        }
        const unsubscribe = useAtomicBatchStore.subscribe(synchronize)
        const unsubscribeStorage = subscribeAtomicBatchStorage()
        synchronize()
        return () => { unsubscribe(); unsubscribeStorage(); for (const stop of running.values()) stop() }
    }, [])

    useEffect(() => {
        if (!swapDetails) return
        const batch = useAtomicBatchStore.getState().batches[swapDetails.id]
        if (!isBatchOutstanding(batch)) return
        // A backend input transaction proves submission even when the sendCalls response
        // was lost. Resume normal progress; this never authorizes another send for that swap.
        const input = swapDetails.transactions?.find(transaction => transaction.type === TransactionType.Input
            && isTransactionHash(transaction.transaction_hash))
        if (input) void useAtomicBatchStore.getState().update(batch.swapId, batch.attempt, { state: 'reconciled' }).catch(() => {})
    }, [swapDetails])
}
