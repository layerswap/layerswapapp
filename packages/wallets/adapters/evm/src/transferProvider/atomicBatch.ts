import { type Config, type Connection, type Connector } from '@wagmi/core'
import { createWalletClient, custom, isAddress, type EIP1193Provider } from 'viem'
import { getCapabilities, sendCalls, getCallsStatus } from 'viem/actions'
import type { AtomicBatchCall, AtomicBatchContext, AtomicBatchProvider, Wallet } from '@layerswap/widget-types'
import { foregroundWalletApp, getDynamicWcMetadata } from '@layerswap/wallet-core'
import { toTransferError } from './toTransferError'
import { EIP155_NAMESPACE, HIDDEN_WALLETCONNECT_ID } from '../constants'

type AtomicCapability = 'supported' | 'ready' | 'unsupported'

type WalletSnapshot = {
    connector: Connector
    currentChainId: number
    sourceChainId: number
    accountsKey: string
    cacheKey: string
    connectionVersion: number
}

type CachedCapability = {
    status: AtomicCapability
    expiresAt: number
    connectorUid: string
    connectionVersion: number
}

type PendingCapabilityCheck = {
    requestId: symbol
    connectionVersion: number
    promise: Promise<AtomicCapability>
}

const CAPABILITY_CACHE_DURATION_MS = 30_000
const UINT256_LIMIT = 2n ** 256n
const ZERO_ADDRESS = /^0x0{40}$/i
const HEX_BYTES = /^0x(?:[0-9a-fA-F]{2})*$/

// viem appends this marker to IDs for its local sequential fallback.
const SEQUENTIAL_BATCH_ID_SUFFIX = '5792'.repeat(16)
const DUPLICATE_BATCH_ID_CODE = 5720
const NON_SUBMISSION_CODES = new Set([
    -32601, // Method not found.
    -32602, // Invalid parameters.
    4100,   // Unauthorized.
    4200,   // Unsupported method.
    5700,   // Unsupported required capability.
    5710,   // Unsupported chain.
    5740,   // Batch too large.
    5750,   // Atomic wallet upgrade rejected.
    5760,   // Atomic execution not supported.
])
const providers = new WeakMap<Config, AtomicBatchProvider>()

/** Submit backend-built calls together and track the batch through its original wallet. */
export function createAtomicBatchProvider(config: Config): AtomicBatchProvider {
    const existingProvider = providers.get(config)
    if (existingProvider) {
        return existingProvider
    }

    const capabilityCache = new Map<string, CachedCapability>()
    const pendingCapabilityChecks = new Map<string, PendingCapabilityCheck>()
    const connectionVersions = new Map<string, number>()
    let nextConnectionVersion = 0

    config.subscribe(state => state.connections, (connections, previousConnections) => {
        // MetaMask emits the target chain again when switchChain finishes. A new
        // map or an unrelated wallet update does not mean this wallet changed.
        const connectorUids = new Set([...connections.keys(), ...previousConnections.keys()])
        for (const uid of connectorUids) {
            const connection = connections.get(uid)
            if (!connection) {
                connectionVersions.delete(uid)
            } else if (hasConnectionChanged(connection, previousConnections.get(uid))) {
                // Never reuse a revision, even after forgetting a disconnected UID.
                // Older discovery and submission snapshots must still fail if the
                // same connector reconnects with the same account and chain.
                connectionVersions.set(uid, ++nextConnectionVersion)
            }
        }
        pruneCapabilityCache()
    })

    function pruneCapabilityCache(): void {
        const now = Date.now()
        for (const [key, cached] of capabilityCache) {
            const isConnected = config.state.connections.has(cached.connectorUid)
            const connectionVersion = connectionVersions.get(cached.connectorUid) ?? 0
            if (!isConnected || cached.connectionVersion !== connectionVersion || cached.expiresAt <= now) {
                capabilityCache.delete(key)
            }
        }
    }

    function readWalletSnapshot(context: AtomicBatchContext): WalletSnapshot {
        context.signal?.throwIfAborted()
        if (!isAddress(context.account)) {
            throw new Error('Invalid batch sender')
        }

        const connector = resolveSelectedConnector(config, context.wallet, context.account)
        const connection = config.state.connections.get(connector.uid)
        if (!connection) {
            throw new Error('Wallet disconnected')
        }
        if (!includesAccount(connection.accounts, context.account)) {
            throw new Error('Batch account changed')
        }

        const sourceChainId = Number(context.network.chain_id)
        if (!Number.isSafeInteger(sourceChainId) || sourceChainId <= 0) {
            throw new Error('Invalid batch chain')
        }

        const currentChainId = connection.chainId
        const accountsKey = accountListKey(connection.accounts)
        const cacheKey = [
            connector.uid,
            context.account.toLowerCase(),
            sourceChainId,
            currentChainId,
            accountsKey,
        ].join(':')

        const connectionVersion = connectionVersions.get(connector.uid) ?? 0
        return { connector, currentChainId, sourceChainId, accountsKey, cacheKey, connectionVersion }
    }

    function assertWalletUnchanged(context: AtomicBatchContext, original: WalletSnapshot): void {
        context.signal?.throwIfAborted()

        let current: WalletSnapshot
        try {
            current = readWalletSnapshot(context)
        } catch (error) {
            throw new Error('Wallet changed during the capability check', { cause: error })
        }

        const connectorChanged = current.connector !== original.connector
        const connectionChanged = connectorChanged || current.cacheKey !== original.cacheKey
        const connectionChangedDuringRequest = current.connectionVersion !== original.connectionVersion
        if (connectionChanged || connectionChangedDuringRequest) {
            // Keep the user-facing error stable while exposing the failed comparisons
            // in its cause, without logging wallet addresses or provider objects.
            const details = [
                `connectorChanged=${connectorChanged}`,
                `chainId=${original.currentChainId}->${current.currentChainId}`,
                `accountsChanged=${original.accountsKey !== current.accountsKey}`,
                `connectionVersion=${original.connectionVersion}->${current.connectionVersion}`,
            ].join(', ')
            throw new Error('Wallet changed during the capability check', {
                cause: new Error(`Selected wallet state changed: ${details}`),
            })
        }
        context.signal?.throwIfAborted()
    }

    async function assertLiveWalletUnchanged(context: AtomicBatchContext, original: WalletSnapshot): Promise<void> {
        // Read the wallet directly: connector state can lag behind account/chain changes.
        const [accounts, chainId] = await Promise.all([
            original.connector.getAccounts(),
            original.connector.getChainId(),
        ])

        if (!includesAccount(accounts, context.account) || chainId !== original.currentChainId) {
            throw new Error('Wallet account or chain changed before submission')
        }
        assertWalletUnchanged(context, original)
    }

    async function checkWalletCapability(
        context: AtomicBatchContext,
        walletSnapshot: WalletSnapshot,
        requestId: symbol,
    ): Promise<AtomicCapability> {
        let status: AtomicCapability = 'unsupported'
        try {
            const client = await createClientForConnector(walletSnapshot.connector)
            // Query all chains so the wallet's global (0x0) capability is included.
            const capabilities = await getCapabilities(client, {
                account: context.account as `0x${string}`,
            })
            const atomicCapability = capabilities[walletSnapshot.sourceChainId]?.atomic ?? capabilities[0]?.atomic
            if (atomicCapability?.status === 'supported' || atomicCapability?.status === 'ready') {
                status = atomicCapability.status
            }
        } catch {
            // Discovery errors leave creation on the existing workflow.
        }

        assertWalletUnchanged(context, walletSnapshot)

        // A fresh request can replace this one. Only the newest request may fill the cache.
        const latestRequest = pendingCapabilityChecks.get(walletSnapshot.cacheKey)
        if (latestRequest?.requestId === requestId) {
            // A slow response may outlive entries that were fresh when it started.
            pruneCapabilityCache()
            capabilityCache.set(walletSnapshot.cacheKey, {
                status,
                expiresAt: Date.now() + CAPABILITY_CACHE_DURATION_MS,
                connectorUid: walletSnapshot.connector.uid,
                connectionVersion: walletSnapshot.connectionVersion,
            })
        }
        return status
    }

    const provider: AtomicBatchProvider = {
        async getCapabilities(context, options) {
            pruneCapabilityCache()
            const walletSnapshot = readWalletSnapshot(context)

            if (!options?.fresh) {
                const cached = capabilityCache.get(walletSnapshot.cacheKey)
                if (cached && cached.expiresAt > Date.now() && cached.connectionVersion === walletSnapshot.connectionVersion) {
                    assertWalletUnchanged(context, walletSnapshot)
                    return cached.status
                }

                const pending = pendingCapabilityChecks.get(walletSnapshot.cacheKey)
                if (pending?.connectionVersion === walletSnapshot.connectionVersion) {
                    const status = await pending.promise
                    assertWalletUnchanged(context, walletSnapshot)
                    return status
                }
            }

            // Selection and swap creation share discovery. Cancelling either caller
            // must not cancel the other caller's wallet request.
            const sharedContext = { ...context, signal: undefined }
            const requestId = Symbol('wallet-capability')
            const promise = checkWalletCapability(sharedContext, walletSnapshot, requestId)
            pendingCapabilityChecks.set(walletSnapshot.cacheKey, {
                requestId,
                connectionVersion: walletSnapshot.connectionVersion,
                promise,
            })

            try {
                const status = await promise
                assertWalletUnchanged(context, walletSnapshot)
                return status
            } finally {
                const latestRequest = pendingCapabilityChecks.get(walletSnapshot.cacheKey)
                if (latestRequest?.requestId === requestId) {
                    pendingCapabilityChecks.delete(walletSnapshot.cacheKey)
                }
            }
        },

        async submit(context) {
            let walletRequestStarted = false
            try {
                const walletSnapshot = readWalletSnapshot(context)
                await assertLiveWalletUnchanged(context, walletSnapshot)
                if (walletSnapshot.currentChainId !== walletSnapshot.sourceChainId) {
                    throw new Error('Switch to the batch source chain')
                }

                const capability = await provider.getCapabilities(context, { fresh: true })
                if (capability !== 'supported') {
                    throw new Error('This wallet does not currently support atomic swaps')
                }

                const chain = config.chains.find(chain => chain.id === walletSnapshot.sourceChainId)
                if (!chain) {
                    throw new Error('Batch chain is not configured')
                }
                validateBatchCalls(context.calls)

                const client = await createClientForConnector(walletSnapshot.connector)
                await foregroundWalletApp(context.wallet.metadata?.deepLink)
                await assertLiveWalletUnchanged(context, walletSnapshot)
                assertBatchNotExpired(context.validBefore)

                context.onWalletPrompt?.()
                walletRequestStarted = true
                const result = await sendCalls(client, {
                    account: context.account as `0x${string}`,
                    chain,
                    calls: context.calls,
                    forceAtomic: true,
                    version: '2.0.0',
                    experimental_fallback: false,
                })

                if (!result || typeof result.id !== 'string' || !result.id.trim()) {
                    throw new Error('Wallet returned no batch ID; reconcile the swap before retrying.')
                }
                return { id: result.id }
            } catch (error) {
                const transferError = toTransferError(error)
                // After sending, an ambiguous error may hide an accepted batch.
                if (!walletRequestStarted || isProvenNonSubmission(error)) {
                    Object.assign(transferError, { atomicSubmission: 'not_submitted' })
                }
                throw transferError
            }
        },

        async getStatus(context, id) {
            if (id.endsWith(SEQUENTIAL_BATCH_ID_SUFFIX)) {
                throw new Error('Sequential batch IDs cannot be tracked as atomic execution')
            }

            const connector = resolveSelectedConnector(config, context.wallet, context.account)
            const client = await createClientForConnector(connector)
            return getCallsStatus(client, { id })
        },
    }

    providers.set(config, provider)
    return provider
}

export function resolveSelectedConnector(config: Config, wallet: Wallet, account: string): Connector {
    const matchingConnections = [...config.state.connections.values()].filter(connection => {
        const connector = connection.connector
        const matchesWalletIdentity = wallet.metadata?.connectorId
            ? connector.id === wallet.metadata.connectorId
            : connector.id === wallet.internalId || connector.name === wallet.id

        const isHiddenWalletConnect = connector.id === HIDDEN_WALLETCONNECT_ID
        const selectedWalletIsHiddenWalletConnect = wallet.internalId === HIDDEN_WALLETCONNECT_ID
        if (isHiddenWalletConnect && !selectedWalletIsHiddenWalletConnect) {
            const connectedWallet = getDynamicWcMetadata(EIP155_NAMESPACE, account)
            if (connectedWallet?.id !== wallet.internalId) {
                return false
            }
        }

        return matchesWalletIdentity && includesAccount(connection.accounts, account)
    })

    const exactConnection = matchingConnections.find(connection =>
        connection.connector.uid === wallet.metadata?.connectorUid,
    )
    if (exactConnection) {
        return exactConnection.connector
    }
    if (matchingConnections.length !== 1) {
        throw new Error('Reconnect the original wallet to continue tracking this batch.')
    }
    return matchingConnections[0].connector
}

function includesAccount(accounts: readonly string[], account: string): boolean {
    return accounts.some(connectedAccount => connectedAccount.toLowerCase() === account.toLowerCase())
}

function accountListKey(accounts: readonly string[]): string {
    // Address casing is cosmetic; account order still matters to wallet selection.
    return accounts.map(account => account.toLowerCase()).join(',')
}

function hasConnectionChanged(current: Connection | undefined, previous: Connection | undefined): boolean {
    if (!current || !previous) {
        return current !== previous
    }
    return current.connector !== previous.connector
        || current.chainId !== previous.chainId
        || accountListKey(current.accounts) !== accountListKey(previous.accounts)
}

async function createClientForConnector(connector: Connector) {
    const provider = await connector.getProvider() as EIP1193Provider
    if (!provider) {
        throw new Error('Wallet provider unavailable')
    }
    return createWalletClient({ transport: custom(provider, { retryCount: 0 }) })
}

function validateBatchCalls(calls: AtomicBatchCall[]): void {
    if (calls.length === 0) {
        throw new Error('Invalid batch calls')
    }
    for (const call of calls) {
        if (!isAddress(call.to) || ZERO_ADDRESS.test(call.to)) {
            throw new Error('Invalid batch calls')
        }
        if (!HEX_BYTES.test(call.data)) {
            throw new Error('Invalid batch calls')
        }
        if (typeof call.value !== 'bigint' || call.value < 0n || call.value >= UINT256_LIMIT) {
            throw new Error('Invalid batch calls')
        }
    }
}

function assertBatchNotExpired(validBefore: number): void {
    const nowInSeconds = Math.floor(Date.now() / 1000)
    if (!Number.isSafeInteger(validBefore) || validBefore <= nowInSeconds) {
        throw new Error('Batch expired. Refresh the quote before retrying.')
    }
}

function isProvenNonSubmission(error: unknown): boolean {
    const errorCodes = new Set<number>()
    let currentError = error
    // Wallet errors may wrap RPC errors in several causes.
    for (let depth = 0; depth < 10 && currentError && typeof currentError === 'object'; depth++) {
        const cause = currentError as { code?: unknown; cause?: unknown }
        if (typeof cause.code === 'number') {
            errorCodes.add(cause.code)
        }
        currentError = cause.cause
    }

    // A duplicate ID can refer to a batch that the wallet already accepted.
    if (errorCodes.has(DUPLICATE_BATCH_ID_CODE)) {
        return false
    }
    return [...errorCodes].some(code => NON_SUBMISSION_CODES.has(code))
}
