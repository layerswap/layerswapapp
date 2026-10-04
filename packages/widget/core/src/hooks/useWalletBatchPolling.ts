import { useEffect } from 'react'
import type { Network, Wallet, SwapLifecycleEvent } from '@layerswap/widget-types'
import LayerSwapApiClient, { BackendTransactionStatus } from '@/lib/apiClients/layerSwapApiClient'
import { resolverService } from '@/lib/resolvers/resolverService'
import { useWalletBatchStore, isBatchOutstanding } from '@/stores/walletBatchStore'
import { useSwapTransactionStore, useDepositSignatureStore } from '@/stores/swapTransactionStore'
import { resolveBatchStatus } from '@/lib/walletBatch'
import { ErrorHandler } from '@/lib/ErrorHandler'

export function useWalletBatchPolling(swapId: string | undefined, network: Network | undefined,
    wallets: Wallet[], onLifecycle: (event: SwapLifecycleEvent) => void) {
    const batch = useWalletBatchStore(state => swapId ? state.batches[swapId] : undefined)
    const wallet = batch && wallets.find(wallet => wallet.id === batch.walletId
        && wallet.internalId === batch.internalId && wallet.providerName === batch.providerName
        && wallet.addresses.some(address => address.toLowerCase() === batch.account.toLowerCase()))
    const connectorUid = wallet?.metadata?.evmConnectorUid
    useEffect(() => {
        if (!swapId || !batch?.id || !isBatchOutstanding(batch) || !wallet || !network
            || network.name !== batch.networkName || Number(network.chain_id) !== batch.chainId) return
        const provider = resolverService.getTransferResolver().getAtomicBatchProvider(network)
        if (!provider) return
        const selectedWallet = { ...wallet, address: batch.account }
        let stopped = false
        let timer: ReturnType<typeof setTimeout>
        let delay = 2000
        const poll = async () => {
            try {
                const result = await provider.getCallsStatus({ network, selectedWallet, id: batch.id! })
                // The result belongs to the captured submission, even after account changes.
                const current = useWalletBatchStore.getState().batches[swapId]
                if (current?.id !== batch.id || !isBatchOutstanding(current)) return
                const resolution = resolveBatchStatus(result, batch.chainId)
                if (resolution.state === 'confirmed') {
                    useSwapTransactionStore.getState().setSwapTransaction(swapId, BackendTransactionStatus.Pending, resolution.hash)
                    useWalletBatchStore.getState().setBatch(swapId, { ...current, state: 'confirmed' })
                    useDepositSignatureStore.getState().removeDepositSignature(swapId)
                    onLifecycle({ step: 'transaction_submitted', stage: 'input_transfer', outcome: 'succeeded',
                        path: 'WalletBatch', action: 'send_calls', provider: batch.providerName,
                        swapId, transactionHash: resolution.hash, fromAddress: batch.account, sourceNetwork: batch.networkName })
                    await new LayerSwapApiClient().SwapCatchup(swapId, resolution.hash).catch(error => {
                        ErrorHandler({ type: 'SwapCatchupError', swapId, transactionHash: resolution.hash,
                            message: error?.message || 'Swap catchup failed', cause: error })
                    })
                    return
                }
                if (resolution.state === 'failed') {
                    useWalletBatchStore.getState().setBatch(swapId, { ...current, state: 'failed' })
                    useSwapTransactionStore.getState().clearPendingSubmission(swapId)
                    return
                }
                if (current.state !== resolution.state)
                    useWalletBatchStore.getState().setBatch(swapId, { ...current, state: resolution.state })
                delay = 2000
            } catch {
                // A status transport failure does not establish non-submission.
                delay = Math.min(delay * 2, 30000)
            }
            if (!stopped) timer = setTimeout(poll, delay)
        }
        void poll()
        return () => { stopped = true; clearTimeout(timer) }
    }, [swapId, batch?.id, batch?.account, batch?.chainId, batch?.state, network?.name,
        network?.chain_id, wallet?.id, wallet?.internalId, connectorUid])
    return batch
}
