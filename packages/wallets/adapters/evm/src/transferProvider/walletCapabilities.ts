import { type Config, type Connection, type Connector } from '@wagmi/core'
import { createWalletClient, custom, isAddress, type EIP1193Provider } from 'viem'
import { getCapabilities } from 'viem/actions'
import { capabilitiesForChain, type AtomicBatchContext, type ChainCapabilities, type Wallet, type WalletCapabilities } from '@layerswap/widget-types'
import { getDynamicWcMetadata } from '@layerswap/wallet-core'
import { EIP155_NAMESPACE, HIDDEN_WALLETCONNECT_ID } from '../constants'

export type WalletCapabilityContext = Pick<AtomicBatchContext, 'network' | 'wallet' | 'account' | 'signal'>

/** Accepted answers by connector uid, then lowercase account. */
export type PublishedCapabilities = Readonly<Record<string, Record<string, ChainCapabilities>>>

export type WalletSnapshot = {
    connector: Connector
    currentChainId: number
    sourceChainId: number
    accountsKey: string
    cacheKey: string
    connectionVersion: number
}

export type WalletCapabilityService = {
    getCapabilities(context: WalletCapabilityContext, options?: { fresh?: boolean }): Promise<WalletCapabilities>
    readWalletSnapshot(context: WalletCapabilityContext): WalletSnapshot
    assertLiveWalletUnchanged(context: WalletCapabilityContext, original: WalletSnapshot): Promise<void>
    getPublished(): PublishedCapabilities
    subscribe(listener: () => void): () => void
}

type PublishedConnection = {
    connector: Connector
    accountsKey: string
    byAccount: Record<string, ChainCapabilities>
}

type CachedCapabilities = {
    capabilities: WalletCapabilities
    expiresAt: number
    connectorUid: string
    connectionVersion: number
}

type PendingCapabilityCheck = {
    requestId: symbol
    connectionVersion: number
    promise: Promise<WalletCapabilities>
}

const NO_CAPABILITIES: WalletCapabilities = { atomic: 'unsupported', alternateGasFees: false }
const CAPABILITY_CACHE_DURATION_MS = 30_000
const CAPABILITY_TIMEOUT_MS = 10_000
const services = new WeakMap<Config, WalletCapabilityService>()

/** One shared, connection-guarded `wallet_getCapabilities` query per wallet, account and chain. */
export function getWalletCapabilityService(config: Config): WalletCapabilityService {
    const existingService = services.get(config)
    if (existingService) {
        return existingService
    }

    const capabilityCache = new Map<string, CachedCapabilities>()
    const pendingCapabilityChecks = new Map<string, PendingCapabilityCheck>()
    const connectionVersions = new Map<string, number>()
    const publishedConnections = new Map<string, PublishedConnection>()
    const listeners = new Set<() => void>()
    let published: PublishedCapabilities = {}
    let nextConnectionVersion = 0

    function publish(): void {
        published = Object.fromEntries([...publishedConnections].map(([uid, entry]) => [uid, entry.byAccount]))
        listeners.forEach(listener => listener())
    }

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

        // Published answers cover every chain, so only a new connector or account set retires them.
        let retired = false
        for (const [uid, entry] of publishedConnections) {
            const connection = connections.get(uid)
            if (!connection || connection.connector !== entry.connector || accountListKey(connection.accounts) !== entry.accountsKey) {
                publishedConnections.delete(uid)
                retired = true
            }
        }
        if (retired) publish()
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

    function readWalletSnapshot(context: WalletCapabilityContext): WalletSnapshot {
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

    function assertWalletUnchanged(context: WalletCapabilityContext, original: WalletSnapshot): void {
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

    async function assertLiveWalletUnchanged(context: WalletCapabilityContext, original: WalletSnapshot): Promise<void> {
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

    async function queryWalletCapabilities(
        context: WalletCapabilityContext,
        walletSnapshot: WalletSnapshot,
        requestId: symbol,
    ): Promise<WalletCapabilities> {
        let chains: ChainCapabilities = {}
        try {
            const client = await createClientForConnector(walletSnapshot.connector)
            // Query all chains so the wallet's global (0x0) capability is included.
            const capabilities = await getCapabilities(client, {
                account: context.account as `0x${string}`,
            })
            chains = parseChainCapabilities(capabilities)
        } catch {
            // Discovery errors leave callers on their existing workflow.
        }
        const result = capabilitiesForChain(chains, walletSnapshot.sourceChainId) ?? NO_CAPABILITIES

        assertWalletUnchanged(context, walletSnapshot)

        // A fresh request can replace this one. Only the newest request may fill the cache.
        const latestRequest = pendingCapabilityChecks.get(walletSnapshot.cacheKey)
        if (latestRequest?.requestId === requestId) {
            // A slow response may outlive entries that were fresh when it started.
            pruneCapabilityCache()
            capabilityCache.set(walletSnapshot.cacheKey, {
                capabilities: result,
                expiresAt: Date.now() + CAPABILITY_CACHE_DURATION_MS,
                connectorUid: walletSnapshot.connector.uid,
                connectionVersion: walletSnapshot.connectionVersion,
            })
            const connector = walletSnapshot.connector
            const entry = publishedConnections.get(connector.uid)
            publishedConnections.set(connector.uid, {
                connector,
                accountsKey: walletSnapshot.accountsKey,
                byAccount: {
                    ...(entry?.connector === connector && entry.accountsKey === walletSnapshot.accountsKey ? entry.byAccount : {}),
                    [context.account.toLowerCase()]: chains,
                },
            })
            publish()
        }
        return result
    }

    async function getWalletCapabilities(context: WalletCapabilityContext, options?: { fresh?: boolean }): Promise<WalletCapabilities> {
        pruneCapabilityCache()
        const walletSnapshot = readWalletSnapshot(context)

        if (!options?.fresh) {
            const cached = capabilityCache.get(walletSnapshot.cacheKey)
            if (cached && cached.expiresAt > Date.now() && cached.connectionVersion === walletSnapshot.connectionVersion) {
                assertWalletUnchanged(context, walletSnapshot)
                return cached.capabilities
            }

            const pending = pendingCapabilityChecks.get(walletSnapshot.cacheKey)
            if (pending?.connectionVersion === walletSnapshot.connectionVersion) {
                const capabilities = await pending.promise
                assertWalletUnchanged(context, walletSnapshot)
                return capabilities
            }
        }

        // Selection and swap creation share discovery. Cancelling either caller
        // must not cancel the other caller's wallet request.
        const sharedContext = { ...context, signal: undefined }
        const requestId = Symbol('wallet-capability')
        const promise = withCapabilityDeadline(
            queryWalletCapabilities(sharedContext, walletSnapshot, requestId),
        )
        pendingCapabilityChecks.set(walletSnapshot.cacheKey, {
            requestId,
            connectionVersion: walletSnapshot.connectionVersion,
            promise,
        })

        try {
            const capabilities = await promise
            assertWalletUnchanged(context, walletSnapshot)
            return capabilities
        } finally {
            const latestRequest = pendingCapabilityChecks.get(walletSnapshot.cacheKey)
            if (latestRequest?.requestId === requestId) {
                pendingCapabilityChecks.delete(walletSnapshot.cacheKey)
            }
        }
    }

    const service: WalletCapabilityService = {
        getCapabilities: getWalletCapabilities,
        readWalletSnapshot,
        assertLiveWalletUnchanged,
        getPublished: () => published,
        subscribe(listener) {
            listeners.add(listener)
            return () => { listeners.delete(listener) }
        },
    }
    services.set(config, service)
    return service
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

export async function createClientForConnector(connector: Connector) {
    const provider = await connector.getProvider() as EIP1193Provider
    if (!provider) {
        throw new Error('Wallet provider unavailable')
    }
    return createWalletClient({ transport: custom(provider, { retryCount: 0 }) })
}

function parseChainCapabilities(response: Record<number, Record<string, any> | undefined>): ChainCapabilities {
    const chains: ChainCapabilities = {}
    for (const [chainId, capabilities] of Object.entries(response)) {
        const atomic = capabilities?.atomic?.status
        chains[Number(chainId)] = {
            atomic: atomic === 'supported' || atomic === 'ready' ? atomic : 'unsupported',
            alternateGasFees: capabilities?.alternateGasFees?.supported === true,
        }
    }
    return chains
}

function includesAccount(accounts: readonly string[], account: string): boolean {
    return accounts.some(connectedAccount => connectedAccount.toLowerCase() === account.toLowerCase())
}

async function withCapabilityDeadline(check: Promise<WalletCapabilities>): Promise<WalletCapabilities> {
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
        return await Promise.race([
            check,
            new Promise<WalletCapabilities>(resolve => {
                // Optional discovery may fall back; a fresh submission check still
                // requires explicit support before opening a wallet prompt.
                timeout = setTimeout(() => resolve(NO_CAPABILITIES), CAPABILITY_TIMEOUT_MS)
            }),
        ])
    } finally {
        clearTimeout(timeout)
    }
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
