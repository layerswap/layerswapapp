import { useEffect, useRef } from 'react'
import type { SwapLifecycleEvent } from '@layerswap/widget-types'
import LayerSwapApiClient, { TransactionType, type SwapDetails } from '@/lib/apiClients/layerSwapApiClient'
import { getExplorerUrl } from '@/lib/address/explorerUrl'
import { resolverService } from '@/lib/resolvers/resolverService'
import { trackAtomicBatch } from '@/lib/atomicBatchTracking'
import { useAtomicBatchStore, subscribeAtomicBatchStorage, type AtomicBatchRecord } from '@/stores/atomicBatchStore'
import { useSwapTransactionStore } from '@/stores/swapTransactionStore'
import { isTransactionHash } from '@/helpers/atomicBatch'
import { useClientLayoutEffect } from './useClientLayoutEffect'

export function useAtomicBatchTracking(swapDetails: SwapDetails | undefined, onLifecycle: (event: SwapLifecycleEvent) => void) {
    const currentBatch = useAtomicBatchStore(state => swapDetails ? state.batches[swapDetails.id] : undefined)
    const emit = useRef(onLifecycle)
    useClientLayoutEffect(() => { emit.current = onLifecycle }, [onLifecycle])
    useEffect(() => {
        const api = new LayerSwapApiClient()
        const running = new Map<string, () => void>()
        const confirm = async (batch: AtomicBatchRecord, hash: string) => {
            if (!isTransactionHash(hash)) throw new Error('Invalid batch receipt hash')
            const transactions = useSwapTransactionStore.getState()
            if (transactions.swapTransactions[batch.swapId]?.hash !== hash) {
                transactions.setSwapTransaction(batch.swapId, hash)
                transactions.setStepTransaction(batch.swapId, 'publish', hash, getExplorerUrl(batch.network.transaction_explorer_template, hash))
                emit.current({ step: 'transaction_submitted', stage: 'input_transfer', outcome: 'succeeded',
                    path: 'AtomicBatchTracking', action: 'approve_and_swap', swapId: batch.swapId,
                    transactionHash: hash, fromAddress: batch.account, sourceNetwork: batch.network.name, provider: batch.wallet.providerName })
            }
            // Keep the ID until the swap API acknowledges the input, so reload can retry catchup.
            await api.SwapCatchup(batch.swapId, hash)
        }
        const synchronize = () => {
            const records = Object.values(useAtomicBatchStore.getState().batches)
            const active = records.filter(batch => batch.id)
            const keys = new Set(active.map(batch => batch.attempt))
            for (const [key, stop] of running) {
                if (!keys.has(key)) { stop(); running.delete(key) }
            }
            for (const batch of active) {
                if (running.has(batch.attempt)) continue
                let stop: (() => void) | undefined
                const timer = setTimeout(() => {
                    stop = trackAtomicBatch(batch, {
                        getRecord: id => useAtomicBatchStore.getState().batches[id],
                        onOutcome: async (record, outcome) => {
                            // Only fresh, complete wallet proof allows another request.
                            if (outcome.state === 'failed' || outcome.state === 'not_submitted') {
                                await useAtomicBatchStore.getState().remove(record.swapId, record.attempt)
                            }
                        },
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
        const batch = currentBatch
        if (!batch) return
        const input = swapDetails.transactions?.find(transaction => transaction.type === TransactionType.Input
            && isTransactionHash(transaction.transaction_hash))
        if (input) void useAtomicBatchStore.getState().remove(batch.swapId, batch.attempt).catch(() => {})
    }, [swapDetails, currentBatch])
}
