import { type Config, type Connector } from '@wagmi/core'
import { createWalletClient, custom, isAddress, type EIP1193Provider } from 'viem'
import { getCapabilities, sendCalls, getCallsStatus } from 'viem/actions'
import type { AtomicBatchContext, AtomicBatchProvider, Wallet } from '@layerswap/widget-types'
import { foregroundWalletApp, getDynamicWcMetadata } from '@layerswap/wallet-core'
import { toTransferError } from './toTransferError'
import { EIP155_NAMESPACE, HIDDEN_WALLETCONNECT_ID } from '../constants'

export function resolveSelectedConnector(config: Config, wallet: Wallet, account: string): Connector {
    const matches = [...config.state.connections.values()].filter(connection => {
        const connector = connection.connector
        const identityMatches = wallet.metadata?.connectorId
            ? connector.id === wallet.metadata.connectorId
            : connector.id === wallet.internalId || connector.name === wallet.id
        if (connector.id === HIDDEN_WALLETCONNECT_ID && wallet.internalId !== HIDDEN_WALLETCONNECT_ID
            && getDynamicWcMetadata(EIP155_NAMESPACE, account)?.id !== wallet.internalId) return false
        return identityMatches && connection.accounts.some(a => a.toLowerCase() === account.toLowerCase())
    })
    const exact = matches.find(c => c.connector.uid === wallet.metadata?.connectorUid)
    if (exact) return exact.connector
    if (matches.length !== 1) throw new Error('Reconnect the original wallet to continue tracking this batch.')
    return matches[0].connector
}

const providers = new WeakMap<Config, AtomicBatchProvider>()
type AtomicCapability = 'supported' | 'ready' | 'unsupported'

export function createAtomicBatchProvider(config: Config): AtomicBatchProvider {
    const existing = providers.get(config)
    if (existing) return existing
    const cache = new Map<string, { status: AtomicCapability; expires: number }>()
    const inFlight = new Map<string, { id: symbol; revision: number; promise: Promise<AtomicCapability> }>()
    let revision = 0
    config.subscribe(state => state.connections, () => { revision++; cache.clear() })

    const snapshot = (context: AtomicBatchContext) => {
        context.signal?.throwIfAborted()
        if (!isAddress(context.account)) throw new Error('Invalid batch sender')
        const connector = resolveSelectedConnector(config, context.wallet, context.account)
        const connection = config.state.connections.get(connector.uid)
        if (!connection) throw new Error('Wallet disconnected')
        const { accounts, chainId: currentChain } = connection
        if (!accounts.some(a => a.toLowerCase() === context.account.toLowerCase())) throw new Error('Batch account changed')
        const chainId = Number(context.network.chain_id)
        if (!Number.isSafeInteger(chainId) || chainId <= 0) throw new Error('Invalid batch chain')
        const key = [connector.uid, context.account.toLowerCase(), chainId, currentChain, accounts.join(',')].join(':')
        return { connector, currentChain, chainId, key, revision }
    }
    const assertCurrent = (context: AtomicBatchContext, before: ReturnType<typeof snapshot>) => {
        context.signal?.throwIfAborted()
        let after: ReturnType<typeof snapshot>
        try {
            after = snapshot(context)
        } catch (error) {
            throw new Error('Wallet changed during the capability check', { cause: error })
        }
        if (after.key !== before.key || after.revision !== before.revision) throw new Error('Wallet changed during the capability check')
        context.signal?.throwIfAborted()
    }
    const assertWalletCurrent = async (context: AtomicBatchContext, before: ReturnType<typeof snapshot>) => {
        const [accounts, chainId] = await Promise.all([before.connector.getAccounts(), before.connector.getChainId()])
        if (!accounts.some(account => account.toLowerCase() === context.account.toLowerCase()) || chainId !== before.currentChain) {
            throw new Error('Wallet account or chain changed before submission')
        }
        assertCurrent(context, before)
    }
    const clientFor = async (connector: Connector) => {
        const provider = await connector.getProvider() as EIP1193Provider
        if (!provider) throw new Error('Wallet provider unavailable')
        return createWalletClient({ transport: custom(provider, { retryCount: 0 }) })
    }
    const provider: AtomicBatchProvider = {
        async getCapabilities(context, options) {
            const before = snapshot(context)
            const cached = cache.get(before.key)
            if (!options?.fresh && cached && cached.expires > Date.now()) {
                assertCurrent(context, before)
                return cached.status
            }
            const existing = inFlight.get(before.key)
            if (!options?.fresh && existing?.revision === before.revision) {
                const status = await existing.promise
                assertCurrent(context, before)
                return status
            }
            // Selection discovery and swap creation share the same lookup. An aborted
            // caller does not cancel another caller's lookup for the same wallet.
            const discoveryContext = { ...context, signal: undefined }
            const requestId = Symbol('wallet-capability')
            const request = (async (): Promise<AtomicCapability> => {
                let status: AtomicCapability = 'unsupported'
                try {
                    const client = await clientFor(before.connector)
                    // Query all chains so EIP-5792's global (0x0) capability is respected.
                    const capabilities = await getCapabilities(client, { account: context.account as `0x${string}` })
                    const atomic = (capabilities[before.chainId]?.atomic ?? capabilities[0]?.atomic)?.status
                    if (atomic === 'supported' || atomic === 'ready') status = atomic
                } catch {
                    // Discovery errors use the existing workflow; they never trigger fallback submission.
                }
                assertCurrent(discoveryContext, before)
                if (inFlight.get(before.key)?.id === requestId) cache.set(before.key, { status, expires: Date.now() + 30_000 })
                return status
            })()
            inFlight.set(before.key, { id: requestId, revision: before.revision, promise: request })
            try {
                const status = await request
                assertCurrent(context, before)
                return status
            } finally {
                if (inFlight.get(before.key)?.promise === request) inFlight.delete(before.key)
            }
        },
        async submit(context) {
            let requested = false
            try {
                const before = snapshot(context)
                await assertWalletCurrent(context, before)
                if (before.currentChain !== before.chainId) throw new Error('Switch to the batch source chain')
                if (await provider.getCapabilities(context, { fresh: true }) !== 'supported') throw new Error('This wallet does not currently support atomic swaps')
                const chain = config.chains.find(c => c.id === before.chainId)
                if (!chain) throw new Error('Batch chain is not configured')
                if (!context.calls.length || context.calls.some(call =>
                    !isAddress(call.to) || /^0x0{40}$/i.test(call.to)
                    || !/^0x(?:[0-9a-fA-F]{2})*$/.test(call.data)
                    || typeof call.value !== 'bigint' || call.value < 0n || call.value >= 2n ** 256n
                )) throw new Error('Invalid batch calls')
                const client = await clientFor(before.connector)
                await foregroundWalletApp(context.wallet.metadata?.deepLink)
                await assertWalletCurrent(context, before)
                if (!Number.isSafeInteger(context.validBefore) || context.validBefore <= Math.floor(Date.now() / 1000)) throw new Error('Batch expired. Refresh the quote before retrying.')
                context.onWalletPrompt?.()
                requested = true
                const result = await sendCalls(client, {
                    account: context.account as `0x${string}`, chain, calls: context.calls,
                    forceAtomic: true, version: '2.0.0', experimental_fallback: false,
                })
                if (!result || typeof result.id !== 'string' || !result.id.trim()) throw new Error('Wallet returned no batch ID; reconcile the swap before retrying.')
                return { id: result.id }
            } catch (error) {
                const mapped = toTransferError(error)
                if (!requested || isProvenNonSubmission(error)) Object.assign(mapped, { atomicSubmission: 'not_submitted' })
                throw mapped
            }
        },
        async getStatus(context, id) {
            // viem interprets its synthetic sequential-fallback IDs locally. Atomic
            // tracking must use only wallet_getCallsStatus on the original connector.
            if (id.endsWith('5792'.repeat(16))) throw new Error('Sequential batch IDs cannot be tracked as atomic execution')
            const connector = resolveSelectedConnector(config, context.wallet, context.account)
            return getCallsStatus(await clientFor(connector), { id })
        },
    }
    providers.set(config, provider)
    return provider
}

function isProvenNonSubmission(error: unknown): boolean {
    const codes = new Set<number>()
    let current = error
    for (let depth = 0; depth < 10 && current && typeof current === 'object'; depth++) {
        const item = current as { code?: unknown; cause?: unknown }
        if (typeof item.code === 'number') codes.add(item.code)
        current = item.cause
    }
    // A duplicate ID can represent a previously accepted batch.
    if (codes.has(5720)) return false
    return [...codes].some(code => [-32601, -32602, 4100, 4200, 5700, 5710, 5740, 5750, 5760].includes(code))
}
