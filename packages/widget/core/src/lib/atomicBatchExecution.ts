import type { AtomicBatchProvider } from '@layerswap/widget-types'
import type { BatchTransferDepositAction } from '@/lib/apiClients/layerSwapApiClient'
import type { DepositExecutionContext } from '@/components/Pages/Swap/Withdraw/Wallet/Common/depositExecution'
import { getAtomicBatchExpiry, validateAtomicBatch } from '@/helpers/atomicBatch'
import { getDepositActionLabel } from '@/helpers/depositActions'
import { useAtomicBatchStore } from '@/stores/atomicBatchStore'
import { isUserRejection } from '@/components/Pages/Swap/Withdraw/Wallet/Common/isUserRejection'
import { lifecycleContextFromSwap, lifecycleErrorDetails } from './swapLifecycle'

export async function executeAtomicBatch(ctx: DepositExecutionContext, action: BatchTransferDepositAction, provider: AtomicBatchProvider): Promise<void> {
    const { swapData, swapBasicData, selectedWallet, signal, onLifecycle } = ctx
    if (ctx.depositActions.length !== 1) throw new Error('Atomic workflow must contain all calls and no separate signature or approval actions')
    const account = ctx.sourceAddress ?? selectedWallet.address
    const calls = validateAtomicBatch(action, swapBasicData, account, swapData.source_address)
    const network = action.network ?? swapBasicData.source_network
    const validBefore = getAtomicBatchExpiry(action)
    signal?.throwIfAborted()
    const attempt = crypto.randomUUID()
    const store = useAtomicBatchStore.getState()
    const wallet = {
        id: selectedWallet.id, internalId: selectedWallet.internalId, providerName: selectedWallet.providerName,
        address: account, addresses: [account], isActive: true, chainId: selectedWallet.chainId,
        metadata: {
            connectorId: selectedWallet.metadata?.connectorId, connectorUid: selectedWallet.metadata?.connectorUid,
            deepLink: selectedWallet.metadata?.deepLink,
        },
    }
    await store.begin({ swapId: swapData.id, attempt, account, wallet, network: { ...network, token: swapBasicData.source_token },
        validBefore, createdAt: Date.now(), state: 'submitting' })
    const lifecycle = { ...lifecycleContextFromSwap(swapBasicData, swapData), path: 'AtomicBatch', action: 'approve_and_swap', provider: selectedWallet.providerName }
    let submissionStarted = false
    try {
        signal?.throwIfAborted()
        ctx.setActionStateText(`${getDepositActionLabel(action)} in your wallet`)
        submissionStarted = true
        const result = await provider.submit({ network, wallet, account, calls, validBefore, signal,
            onWalletPrompt: () => onLifecycle({ ...lifecycle, step: 'wallet_prompt_opened', stage: 'wallet_action', outcome: 'pending' }) })
        if (!result || typeof result.id !== 'string' || !result.id.trim()) throw new Error('Wallet returned no batch ID')
        // An open wallet request outlives the screen/account that started it.
        await store.update(swapData.id, attempt, { id: result.id, state: 'pending' })
    } catch (error) {
        const rejected = isUserRejection(error)
        const notSubmitted = !submissionStarted || (error as { atomicSubmission?: string })?.atomicSubmission === 'not_submitted'
        await store.update(swapData.id, attempt, { state: rejected ? 'rejected' : notSubmitted ? 'not_submitted' : 'uncertain' })
        onLifecycle({ ...lifecycle, ...lifecycleErrorDetails(error),
            step: rejected ? 'wallet_action_rejected' : 'wallet_action_failed', stage: 'wallet_action', outcome: rejected ? 'rejected' : 'failed' })
        throw error
    }
}
