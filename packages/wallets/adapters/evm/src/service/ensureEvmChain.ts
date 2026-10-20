import type { EnsureWalletChainOptions } from '@layerswap/wallet-core/types'
import { isUserRejection } from '@layerswap/wallet-core/errors'
import { numberToHex, type AddEthereumChainParameter, type Chain } from 'viem'

export type ChainProvider = {
    request(args: { method: string; params?: unknown }): Promise<unknown>
    on?(event: string, listener: (...args: any[]) => void): unknown
    removeListener?(event: string, listener: (...args: any[]) => void): unknown
}

type Options = EnsureWalletChainOptions & {
    getProvider: () => Promise<ChainProvider | undefined>
    chain: Chain
    account?: string
    /** Connection identity is checked before and after every asynchronous boundary. */
    assertConnected?: () => void
    onReady: () => void | Promise<void>
    addEthereumChainParameter?: Partial<AddEthereumChainParameter>
    timeoutMs?: number
}

const pendingProviders = new WeakSet<ChainProvider>()
const disconnected = (message: string) => Object.assign(new Error(message), { reasonCode: 'wallet_disconnected' })

/** A raw wallet response, not viem's generic SwitchChainError (which also uses 4902). */
function isUnknownChain(error: unknown): boolean {
    if (isUserRejection(error)) return false
    const queue: unknown[] = [error]
    const seen = new Set<object>()
    for (let index = 0; index < queue.length && index < 16; index++) {
        const value = queue[index]
        if (!value || typeof value !== 'object' || seen.has(value)) continue
        seen.add(value)
        const candidate = value as Record<string, unknown>
        if (candidate.name !== 'SwitchChainError' && String(candidate.code) === '4902') return true
        for (const key of ['cause', 'data', 'originalError', 'error']) {
            if (candidate[key] && typeof candidate[key] === 'object') queue.push(candidate[key])
        }
    }
    return false
}

/**
 * A resolved switch RPC is only an acknowledgement. Readiness means the selected
 * provider reports the target chain and still authorizes the selected account.
 * One deadline owns discovery, switching, optional addition and synchronization.
 * Only reads are repeated; a pending/rejected RPC is never retried or swallowed.
 */
export async function ensureEvmChain(options: Options): Promise<void> {
    const { chain, account, assertConnected, onSwitchStart, onReady, timeoutMs = 60_000 } = options
    let phase = 'provider'
    let switchResponse = 'not_requested'
    let lastChainId: number | undefined
    let lastEventChainId: number | undefined
    let chainReads = 0
    let chainEvents = 0
    const controller = new AbortController()
    const { signal } = controller
    const abort = () => controller.abort(options.signal?.reason)
    options.signal?.addEventListener('abort', abort, { once: true })
    if (options.signal?.aborted) abort()
    // Log only protocol state, never addresses, request payloads or session secrets.
    // In particular, distinguish an unanswered RPC from a stale SDK chain cache.
    const timeoutError = () => Object.assign(new Error(
        `Timed out waiting for wallet network ${chain.id}; phase=${phase}; switch_response=${switchResponse}; last_chain=${lastChainId ?? 'unknown'}; chain_reads=${chainReads}; chain_events=${chainEvents}; last_event_chain=${lastEventChainId ?? 'unknown'}`,
    ), { reasonCode: 'timeout' })
    const deadline = Date.now() + timeoutMs
    const timer = setTimeout(() => controller.abort(timeoutError()), timeoutMs)
    let provider: ChainProvider | undefined
    let ownsProvider = false
    let wake: (() => void) | undefined
    const chainChanged = (value: unknown) => {
        chainEvents++
        const id = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN
        if (Number.isSafeInteger(id) && id > 0) lastEventChainId = id
        wake?.()
    }
    const accountsChanged = (accounts: string[]) => {
        if (account && (!Array.isArray(accounts) || !accounts.some(value => typeof value === 'string' && value.toLowerCase() === account.toLowerCase()))) {
            controller.abort(disconnected('Selected wallet account changed. Please try again with the selected account.'))
        }
    }
    const disconnect = (error?: { code?: unknown }) => {
        // MetaMask emits 1013 while it reconnects, e.g. to the new network's RPC
        // (https://github.com/MetaMask/providers/pull/120). The account and chain
        // checks below still fail if the session is really gone.
        if (error?.code === 1013) return
        controller.abort(disconnected('Selected wallet disconnected. Reconnect your wallet.'))
    }
    const check = () => {
        // Mobile browsers can suspend timers while the wallet is foregrounded.
        if (Date.now() >= deadline) controller.abort(timeoutError())
        signal.throwIfAborted()
        assertConnected?.()
    }
    const run = async <T>(operation: () => Promise<T>): Promise<T> => {
        check()
        let onAbort: () => void = () => {}
        try {
            const result = await Promise.race([
                Promise.resolve().then(() => { check(); return operation() }),
                new Promise<never>((_, reject) => {
                    onAbort = () => reject(signal.reason)
                    signal.addEventListener('abort', onAbort, { once: true })
                }),
            ])
            check()
            return result
        } finally {
            signal.removeEventListener('abort', onAbort)
        }
    }
    const waitForUpdate = () => new Promise<void>((resolve, reject) => {
        const finish = () => { cleanup(); resolve() }
        const cancelled = () => { cleanup(); reject(signal.reason) }
        const poll = setTimeout(finish, 100)
        const cleanup = () => {
            clearTimeout(poll)
            signal.removeEventListener('abort', cancelled)
            wake = undefined
        }
        wake = finish
        signal.addEventListener('abort', cancelled, { once: true })
        if (signal.aborted) cancelled()
    })
    try {
        provider = await run(options.getProvider)
        if (!provider?.request) throw disconnected('Wallet provider is not available')
        if (pendingProviders.has(provider)) {
            throw Object.assign(new Error('A network request is already pending for this wallet'), { code: -32002 })
        }
        pendingProviders.add(provider)
        ownsProvider = true
        const walletProvider = provider
        if (provider.on && provider.removeListener) {
            provider.on('chainChanged', chainChanged)
            provider.on('accountsChanged', accountsChanged)
            provider.on('disconnect', disconnect)
        }
        const request = (method: string, params?: unknown) => {
            phase = method
            return run(() => walletProvider.request({ method, params }))
        }
        const readChain = async () => {
            chainReads++
            const value = await request('eth_chainId')
            const id = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN
            if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Wallet returned an invalid chain ID')
            lastChainId = id
            return id
        }
        const checkAccount = async () => {
            if (!account) return
            const accounts = await request('eth_accounts')
            if (!Array.isArray(accounts) || !accounts.some(value => typeof value === 'string' && value.toLowerCase() === account.toLowerCase())) {
                throw disconnected('Selected wallet account is no longer connected. Reconnect your wallet.')
            }
        }
        await checkAccount()
        if (await readChain() !== chain.id) {
            onSwitchStart?.()
            const switchChain = async () => {
                switchResponse = 'pending'
                try {
                    await request('wallet_switchEthereumChain', [{ chainId: numberToHex(chain.id) }])
                    switchResponse = 'resolved'
                } catch (error) {
                    switchResponse = 'rejected'
                    throw error
                }
            }
            try {
                await switchChain()
            } catch (error) {
                if (!isUnknownChain(error)) throw error
                // An override replaces a chain default only when it carries a value;
                // wallets reject an empty or missing rpcUrls list.
                const overrides = Object.fromEntries(Object.entries(options.addEthereumChainParameter ?? {})
                    .filter(([, value]) => value !== undefined && !(Array.isArray(value) && value.length === 0)))
                await request('wallet_addEthereumChain', [{
                    chainName: chain.name,
                    nativeCurrency: chain.nativeCurrency,
                    rpcUrls: chain.rpcUrls.default.http,
                    blockExplorerUrls: chain.blockExplorers?.default ? [chain.blockExplorers.default.url] : undefined,
                    ...overrides,
                    chainId: numberToHex(chain.id),
                }])
                // EIP-3085 does not require adding a chain to select it.
                if (await readChain() !== chain.id) await switchChain()
            }
        }
        while (await readChain() !== chain.id) await waitForUpdate()
        phase = 'connector_sync'
        await run(async () => { await onReady() })
        // Bookkeeping and account verification are asynchronous. Revalidate both
        // before handing off to the prepared signing/transaction request.
        await checkAccount()
        while (await readChain() !== chain.id) await waitForUpdate()
    } finally {
        clearTimeout(timer)
        options.signal?.removeEventListener('abort', abort)
        if (ownsProvider && provider) {
            provider.removeListener?.('chainChanged', chainChanged)
            provider.removeListener?.('accountsChanged', accountsChanged)
            provider.removeListener?.('disconnect', disconnect)
            pendingProviders.delete(provider)
        }
    }
}
