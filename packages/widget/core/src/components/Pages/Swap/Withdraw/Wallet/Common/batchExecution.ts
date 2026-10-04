import type { AtomicBatchProvider } from '@layerswap/widget-types'
import type { BatchDepositAction } from '@/lib/apiClients/layerSwapApiClient'
import type { DepositExecutionContext } from './depositExecution'
import { useWalletBatchStore, isBatchOutstanding, type WalletBatch } from '@/stores/walletBatchStore'
import { useSwapTransactionStore } from '@/stores/swapTransactionStore'
import { isUserRejection } from './isUserRejection'
import { lifecycleContextFromSwap, lifecycleErrorDetails } from '@/lib/swapLifecycle'
import { widgetTelemetry } from '@/lib/widgetTelemetry'

export async function executeWalletBatch(ctx: DepositExecutionContext, provider: AtomicBatchProvider | undefined, action: BatchDepositAction) {
    const { swapData, selectedWallet, signal, onLifecycle, setActionStateText } = ctx
    const store = useWalletBatchStore.getState()
    const transactions = useSwapTransactionStore.getState()
    if (isBatchOutstanding(store.batches[swapData.id]) || transactions.pendingSubmissions[swapData.id]
        || (transactions.swapTransactions[swapData.id] && transactions.swapTransactions[swapData.id].status !== 'failed'))
        throw new Error('This swap already has an outstanding submission. Check your wallet.')
    if (!provider || action.atomic_required !== true || action.calls.length < 2
        || action.from_address.toLowerCase() !== selectedWallet.address.toLowerCase()
        || (swapData.source_address && swapData.source_address.toLowerCase() !== action.from_address.toLowerCase())
        || Number(action.network.chain_id) !== Number(ctx.swapBasicData.source_network.chain_id)
        || !Number.isFinite(action.valid_before) || action.valid_before * 1000 <= Date.now()
        || action.calls.some(call => !/^0x[\da-f]{40}$/i.test(call.to_address)
            || !/^0x(?:[\da-f]{2})+$/i.test(call.call_data) || call.amount_in_base_units !== '0'))
        throw new Error('The atomic swap calls are invalid or expired. Refresh the swap.')

    const context = { network: action.network, selectedWallet }
    const batch: WalletBatch = {
        walletId: selectedWallet.id,
        internalId: selectedWallet.internalId,
        providerName: selectedWallet.providerName,
        account: selectedWallet.address,
        chainId: Number(action.network.chain_id),
        networkName: action.network.name,
        state: 'submitting', timestamp: Date.now(),
    }
    const capability = await provider.getCapabilities(context).catch(() => 'unsupported')
    signal?.throwIfAborted()
    if (capability !== 'supported') {
        store.setBatch(swapData.id, { ...batch, state: 'failed', standardNextAttempt: true })
        throw new Error('Atomic batching is no longer available. Try again to use the standard flow.')
    }
    // Check again after capability lookup: another widget may have started this swap.
    if (isBatchOutstanding(useWalletBatchStore.getState().batches[swapData.id])
        || useSwapTransactionStore.getState().pendingSubmissions[swapData.id])
        throw new Error('This swap already has an outstanding submission.')
    if (action.valid_before * 1000 <= Date.now())
        throw new Error('The atomic swap calls expired. Refresh the swap.')
    store.setBatch(swapData.id, batch)
    transactions.markSubmissionPending(swapData.id)
    setActionStateText('Approve and swap in your wallet')
    const lifecycle = { ...lifecycleContextFromSwap(ctx.swapBasicData, swapData), path: 'WalletBatch',
        action: 'send_calls', provider: selectedWallet.providerName }
    const finish = widgetTelemetry.beginOperation('wallet_transfer', {
        swap_id: swapData.id, provider: selectedWallet.providerName, timing_kind: 'user_wait_included',
    })
    onLifecycle({ ...lifecycle, step: 'wallet_prompt_opened', stage: 'wallet_action', outcome: 'pending' })
    let id: string
    try {
        const result = await provider.sendCalls({ ...context, calls: action.calls, validBefore: action.valid_before })
        if (!result?.id || typeof result.id !== 'string') throw new Error('Wallet returned no batch ID. Check your wallet before retrying.')
        id = result.id
    } catch (error) {
        const rejected = isUserRejection(error)
        const notSubmitted = rejected || (error as { notSubmitted?: boolean })?.notSubmitted === true
        if (notSubmitted) {
            transactions.clearPendingSubmission(swapData.id)
            if (rejected) store.removeBatch(swapData.id)
            else store.setBatch(swapData.id, { ...batch, state: 'failed', standardNextAttempt: true })
        } else store.setBatch(swapData.id, { ...batch, state: 'unknown' })
        const details = lifecycleErrorDetails(error)
        finish(rejected ? 'rejected' : 'failed', { occurrence_id: details.occurrenceId })
        onLifecycle({ ...lifecycle, ...details, step: rejected ? 'wallet_action_rejected' : 'wallet_action_failed',
            stage: 'wallet_action', outcome: rejected ? 'rejected' : 'failed' })
        throw error
    }
    // Persist accepted submissions even if the screen closed or the account changed.
    store.setBatch(swapData.id, { ...batch, id, state: 'pending' })
    finish('succeeded')
    ctx.onSuccess()
}
