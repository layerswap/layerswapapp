import { getConnections, getConnectorClient, type Config } from '@wagmi/core'
import { getCapabilities, sendCalls, getCallsStatus } from 'viem/actions'
import { foregroundWalletApp } from '@layerswap/wallet-core'
import type { AtomicBatchContext, AtomicBatchProvider } from '@layerswap/widget-types'
import { toTransferError } from './toTransferError'
import { useEvmStore } from '../service/evmStore'

function notSubmitted(message: string) {
    return Object.assign(new Error(message), { notSubmitted: true })
}

function rpcCode(error: unknown): number | undefined {
    const visited = new Set<unknown>()
    let current = error
    while (current && typeof current === 'object' && !visited.has(current)) {
        visited.add(current)
        const item = current as { code?: number; cause?: unknown }
        if (typeof item.code === 'number') return item.code
        current = item.cause
    }
    return undefined
}

export function createEvmAtomicBatch(config: Config): AtomicBatchProvider {
    const clientFor = async ({ network, selectedWallet }: AtomicBatchContext, sending = false) => {
        const chainId = Number(network.chain_id)
        const account = selectedWallet.address.toLowerCase()
        const connections = getConnections(config)
        const connection = connections.find(({ connector, accounts }) => {
            const identity = selectedWallet.metadata?.evmConnectorUid
                ? connector.uid === selectedWallet.metadata.evmConnectorUid
                : selectedWallet.metadata?.evmConnectorId
                    ? connector.id === selectedWallet.metadata.evmConnectorId
                    : connector.name === selectedWallet.id
            return identity && accounts.some(address => address.toLowerCase() === account)
        })
        if (!connection || !Number.isSafeInteger(chainId) || chainId <= 0)
            throw notSubmitted('Reconnect the original wallet to check this batch.')
        const assertSelectedContext = () => {
            const liveConnection = getConnections(config).find(item => item.connector.uid === connection.connector.uid)
            const state = useEvmStore.getState()
            const activeAddress = state.selectedAddress && state.wagmiAccount.addresses?.some(address =>
                address.toLowerCase() === state.selectedAddress?.toLowerCase())
                ? state.selectedAddress : state.wagmiAccount.address
            if (!selectedWallet.isActive || liveConnection?.chainId !== chainId
                || !liveConnection.accounts.some(address => address.toLowerCase() === account)
                || config.state.current !== connection.connector.uid || activeAddress?.toLowerCase() !== account)
                throw notSubmitted('The wallet account or source chain changed. Please try again.')
        }
        if (sending) assertSelectedContext()
        const client = await getConnectorClient(config, {
            connector: connection.connector,
            account: selectedWallet.address as `0x${string}`,
            chainId,
        })
        if (sending) assertSelectedContext()
        return client
    }

    return {
        async getCapabilities(context) {
            const client = await clientFor(context)
            const capability = await getCapabilities(client, {
                account: context.selectedWallet.address as `0x${string}`,
                chainId: Number(context.network.chain_id),
            })
            const status = capability?.atomic?.status
            return status === 'supported' || status === 'ready' ? status : 'unsupported'
        },
        async sendCalls(context) {
            let client: Awaited<ReturnType<typeof clientFor>>
            let calls: { to: `0x${string}`; data: `0x${string}`; value: bigint }[]
            try {
                client = await clientFor(context, true)
                const capability = await getCapabilities(client, {
                    account: context.selectedWallet.address as `0x${string}`,
                    chainId: Number(context.network.chain_id),
                }).catch(() => undefined)
                if (capability?.atomic?.status !== 'supported')
                    throw notSubmitted('Atomic batching is no longer available. Please try again with the standard flow.')
                calls = context.calls.map(call => ({
                    to: call.to_address as `0x${string}`,
                    data: call.call_data as `0x${string}`,
                    value: BigInt(call.amount_in_base_units),
                }))
                await foregroundWalletApp(context.selectedWallet.metadata?.deepLink)
                // Revalidate after foregrounding, before the only submission request.
                await clientFor(context, true)
                if (!Number.isFinite(context.validBefore) || context.validBefore * 1000 <= Date.now())
                    throw notSubmitted('The atomic swap quote expired. Please refresh the swap.')
            } catch (error) {
                // No wallet_sendCalls request has started; preflight failures permit explicit retry.
                throw Object.assign(toTransferError(error), { notSubmitted: true })
            }
            try {
                return await sendCalls(client, {
                    account: context.selectedWallet.address as `0x${string}`,
                    calls,
                    forceAtomic: true,
                    experimental_fallback: false,
                    version: '2.0.0',
                })
            } catch (error) {
                const mapped = toTransferError(error)
                // These RPC refusals establish that no batch was accepted. Transport failures do not.
                const code = rpcCode(error)
                if (code !== undefined && [4001, 4100, 4200, -32601, -32602, 5700, 5710, 5740, 5750, 5760].includes(code))
                    Object.assign(mapped, { notSubmitted: true })
                throw mapped
            }
        },
        async getCallsStatus(context) {
            const client = await clientFor(context)
            const result = await getCallsStatus(client, { id: context.id })
            return {
                statusCode: result.statusCode,
                atomic: result.atomic,
                chainId: result.chainId,
                receipts: (result.receipts ?? []).map(receipt => ({
                    transactionHash: receipt.transactionHash,
                    status: receipt.status,
                })),
            }
        },
    }
}
