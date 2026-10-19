import type { AtomicBatchContext, AtomicBatchProvider } from '@layerswap/widget-types'
import type { BatchTransferDepositAction } from '@/lib/apiClients/layerSwapApiClient'
import type { DepositExecutionContext } from '@/components/Pages/Swap/Withdraw/Wallet/Common/depositExecution'
import { getAtomicBatchExpiry, resolveAtomicBatchOutcome, validateAtomicBatch } from '@/helpers/atomicBatch'
import { getDepositActionLabel } from '@/helpers/depositActions'
import { useSwapTransactionStore } from '@/stores/swapTransactionStore'
import { getExplorerUrl } from '@/lib/address/explorerUrl'
import { isUserRejection } from '@/components/Pages/Swap/Withdraw/Wallet/Common/isUserRejection'
import { lifecycleContextFromSwap, lifecycleErrorDetails } from './swapLifecycle'

/** The wallet's batch ID is only needed while this submission waits for its receipt. */
async function waitForBatchReceipt(provider: AtomicBatchProvider, context: AtomicBatchContext, id: string): Promise<string> {
    let stopped = false
    let timeout: ReturnType<typeof setTimeout> | undefined
    const poll = async (): Promise<string> => {
        while (!stopped) {
            let result: unknown
            try {
                result = await provider.getStatus(context, id)
            } catch {
                // Receipt availability and transport errors can be transient.
            }
            if (stopped) break
            const outcome = resolveAtomicBatchOutcome(result, Number(context.network.chain_id), id)
            if (outcome.state === 'confirmed') return outcome.hash
            if (outcome.state === 'failed' || outcome.state === 'not_submitted') {
                throw new Error('The wallet batch was not executed successfully.')
            }
            await new Promise(resolve => setTimeout(resolve, 2000))
        }
        throw new Error('Stopped waiting for the wallet batch receipt.')
    }
    try {
        return await Promise.race([
            poll(),
            new Promise<never>((_, reject) => {
                timeout = setTimeout(() => reject(new Error('Timed out waiting for the wallet batch receipt. Check the swap status before retrying.')), 120_000)
            }),
        ])
    } finally {
        stopped = true
        clearTimeout(timeout)
    }
}

export async function executeAtomicBatch(ctx: DepositExecutionContext, action: BatchTransferDepositAction, provider: AtomicBatchProvider): Promise<void> {
    const { swapData, swapBasicData, selectedWallet, signal, onLifecycle } = ctx
    if (ctx.depositActions.length !== 1) throw new Error('Atomic workflow must contain all calls and no separate signature or approval actions')
    const account = ctx.sourceAddress ?? selectedWallet.address
    const calls = validateAtomicBatch(action, swapBasicData, account, swapData.source_address)
    const network = action.network ?? swapBasicData.source_network
    const validBefore = getAtomicBatchExpiry(action)
    signal?.throwIfAborted()
    const context: AtomicBatchContext = { network, wallet: selectedWallet, account }
    const lifecycle = { ...lifecycleContextFromSwap(swapBasicData, swapData), path: 'AtomicBatch', action: 'approve_and_swap', provider: selectedWallet.providerName }
    let hash: string
    try {
        ctx.setActionStateText(`${getDepositActionLabel(action)} in your wallet`)
        const result = await provider.submit({ ...context, calls, validBefore, signal,
            onWalletPrompt: () => onLifecycle({ ...lifecycle, step: 'wallet_prompt_opened', stage: 'wallet_action', outcome: 'pending' }) })
        if (!result || typeof result.id !== 'string' || !result.id.trim()) throw new Error('Wallet returned no batch ID')
        ctx.setActionStateText('Confirming swap…')
        // Finish recording an already-submitted transaction even if its screen closes.
        hash = await waitForBatchReceipt(provider, context, result.id)
    } catch (error) {
        const rejected = isUserRejection(error)
        onLifecycle({ ...lifecycle, ...lifecycleErrorDetails(error),
            step: rejected ? 'wallet_action_rejected' : 'wallet_action_failed', stage: 'wallet_action', outcome: rejected ? 'rejected' : 'failed' })
        throw error
    }
    ctx.setSwapTransaction(swapData.id, hash, 'atomic-batch')
    useSwapTransactionStore.getState().setStepTransaction(
        swapData.id, 'publish', hash, getExplorerUrl(network.transaction_explorer_template, hash),
    )
    onLifecycle({ ...lifecycle, step: 'transaction_submitted', stage: 'input_transfer', outcome: 'succeeded', transactionHash: hash })
    ctx.onSuccess()
    try {
        await ctx.layerswapApiClient.SwapCatchup(swapData.id, hash)
    } catch {
        // The receipt is already saved; optional catchup cannot undo execution.
    }
}
