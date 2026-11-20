import type { AtomicBatchContext, AtomicBatchProvider } from '@layerswap/widget-types'
import type { BatchTransferDepositAction } from '@/lib/apiClients/layerSwapApiClient'
import type { DepositExecutionContext } from '@/components/Pages/Swap/Withdraw/Wallet/Common/depositExecution'
import { getAtomicBatchExpiry, validateAtomicBatch } from '@/helpers/atomicBatch'
import { getDepositActionLabel } from '@/helpers/depositActions'
import { hasUnacknowledgedWalletAction } from '@/helpers/swapProgress'
import { useSwapTransactionStore } from '@/stores/swapTransactionStore'
import { isUserRejection } from '@/components/Pages/Swap/Withdraw/Wallet/Common/isUserRejection'
import { lifecycleContextFromSwap, lifecycleErrorDetails } from './swapLifecycle'

export async function executeAtomicBatch(ctx: DepositExecutionContext, action: BatchTransferDepositAction, provider: AtomicBatchProvider): Promise<void> {
    const { swapData, swapBasicData, selectedWallet, signal, onLifecycle } = ctx
    if (ctx.depositActions.length !== 1) throw new Error('Atomic workflow must contain all calls and no separate signature or approval actions')
    const account = ctx.sourceAddress ?? selectedWallet.address
    const calls = validateAtomicBatch(action, swapBasicData, account, swapData.source_address)
    if (calls.length < 2) throw new Error('A single call must be submitted as a regular transaction')
    const network = action.network ?? swapBasicData.source_network
    const validBefore = getAtomicBatchExpiry(action)
    signal?.throwIfAborted()
    const context: AtomicBatchContext = { network, wallet: selectedWallet, account }
    const lifecycle = { ...lifecycleContextFromSwap(swapBasicData, swapData), path: 'AtomicBatch', action: 'approve_and_swap', provider: selectedWallet.providerName }
    const store = useSwapTransactionStore.getState()
    if (hasUnacknowledgedWalletAction({
        transaction: store.swapTransactions[swapData.id],
        pendingSubmission: store.pendingSubmissions[swapData.id],
    })) {
        throw new Error('This swap may already be submitted. Check its status before retrying.')
    }
    try {
        ctx.setActionStateText(`${getDepositActionLabel(action)} in your wallet`)
        // Keep deduplication after a lost response or screen closure. A batch ID
        // belongs to the wallet and must never be recorded as a transaction hash.
        store.markSubmissionPending(swapData.id)
        store.setSwapTransactionKind(swapData.id, 'atomic-batch')
        const result = await provider.submit({ ...context, calls, validBefore, signal,
            onWalletPrompt: () => onLifecycle({ ...lifecycle, step: 'wallet_prompt_opened', stage: 'wallet_action', outcome: 'pending' }) })
        if (!result || typeof result.id !== 'string' || !result.id.trim()) throw new Error('Wallet returned no batch ID')
        store.setAtomicBatchSubmission(swapData.id, { id: result.id })
    } catch (error) {
        const rejected = isUserRejection(error)
        const notSubmitted = error !== null && typeof error === 'object'
            && 'atomicSubmission' in error && error.atomicSubmission === 'not_submitted'
        if (rejected || notSubmitted) {
            store.clearPendingSubmission(swapData.id)
        }
        onLifecycle({ ...lifecycle, ...lifecycleErrorDetails(error),
            step: rejected ? 'wallet_action_rejected' : 'wallet_action_failed', stage: 'wallet_action', outcome: rejected ? 'rejected' : 'failed' })
        throw error
    }
    // Backend polling owns confirmation. The wallet's opaque batch ID is never
    // used as a transaction hash or as a reason to issue another wallet request.
    const transactionHash = useSwapTransactionStore.getState().swapTransactions[swapData.id]?.hash
    try {
        onLifecycle({ ...lifecycle, step: 'transaction_submitted', stage: 'input_transfer', outcome: 'succeeded', transactionHash })
    } catch {
        // Observer failures cannot undo an accepted wallet submission.
    }
    ctx.onSuccess()
}
