import type { Network, SwapLifecycleEvent, Wallet } from '@layerswap/widget-types'
import type { WalletConnectionProvider } from '@layerswap/wallet-core/types'
import { lifecycleErrorDetails, type SwapLifecycleContext } from '@/lib/swapLifecycle'
import { isUserRejection } from './isUserRejection'

type ChainSwitcher = (wallet: Wallet, chainId: string | number) => Promise<void>

/**
 * Why the wallet did not end up on the source chain. `pending` and `timeout` are stalls
 * rather than refusals: the wallet is still showing the prompt (a second tap while it is
 * open answers "already pending"), or it never answered at all. `disconnected` means the
 * readiness check lost the selected wallet or account, which needs a reconnect.
 */
type NetworkSwitchFailure = 'rejected' | 'pending' | 'timeout' | 'disconnected' | 'failed'

/**
 * A chain switch the wallet refused or could not complete. `cause` is the wallet's own
 * error, so rejection detection and the error copy still see the provider's shape.
 */
export class NetworkSwitchError extends Error {
    readonly kind: NetworkSwitchFailure

    constructor(network: Network, kind: NetworkSwitchFailure, cause: unknown) {
        super(`Could not switch the wallet to ${network.display_name}`)
        this.name = 'NetworkSwitchError'
        this.kind = kind
        this.cause = cause
    }
}

/**
 * Compatibility deadline for legacy providers without an ensureChain contract.
 * Readiness-aware adapters own their deadline and do not use this timer.
 */
const SWITCH_CHAIN_TIMEOUT_MS = 60_000

/**
 * Only wallets that report their current chain (EVM, Fuel) can sit on the wrong one; the
 * others report none. wagmi reports numeric ids while the API serves strings, hence the
 * loose comparison.
 */
export const needsChainSwitch = (wallet: Pick<Wallet, 'chainId'>, network: Pick<Network, 'chain_id'>): boolean =>
    // Fuel testnet uses numeric 0, which is a valid reported chain.
    wallet.chainId != null && wallet.chainId !== ''
    && network.chain_id != null && network.chain_id !== ''
    && wallet.chainId != network.chain_id

type ErrorWithShortMessage = { shortMessage?: string; cause?: unknown }

/** The wallet's short reason for a failed switch, when it gives one (viem-style errors). */
export function networkSwitchFailureReason(error: unknown): string | undefined {
    let current: unknown = error
    for (let depth = 0; current && typeof current === 'object' && depth < 4; depth++) {
        const { shortMessage, cause } = current as ErrorWithShortMessage
        if (shortMessage) return shortMessage
        current = cause
    }
    return undefined
}

const classifyFailure = (rejected: boolean, reasonCode: string | undefined): NetworkSwitchFailure =>
    rejected ? 'rejected'
        : reasonCode === 'request_pending' ? 'pending'
            : reasonCode === 'timeout' ? 'timeout'
                : reasonCode === 'wallet_disconnected' ? 'disconnected'
                    : 'failed'

async function withTimeout<T>(promise: Promise<T>, ms: number, timeoutError: () => Error): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined
    const expiry = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(timeoutError()), ms)
    })
    try {
        return await Promise.race([promise, expiry])
    } finally {
        clearTimeout(timer)
    }
}

type EnsureSourceChainOptions = {
    wallet: Wallet
    network: Network
    switchChain: ChainSwitcher | undefined
    ensureChain?: WalletConnectionProvider['ensureChain']
    signal?: AbortSignal
    /** Swap identity merged into every lifecycle event. */
    context: SwapLifecycleContext
    path: string
    onLifecycle: (event: SwapLifecycleEvent) => void
    /** Runs once a switch turns out to be needed, right before the wallet prompt. */
    onSwitchStart?: () => void
    /** Legacy switch-only providers; readiness-aware adapters own their deadline. */
    timeoutMs?: number
}

/**
 * Presents readiness progress for each prepared wallet action. Adapters with
 * ensureChain verify live state even if the rendered wallet snapshot looks ready;
 * legacy providers retain their snapshot-based switch flow.
 */
export async function ensureSourceChain(options: EnsureSourceChainOptions): Promise<void> {
    const { wallet, network, switchChain, ensureChain, signal, context, path, onLifecycle, onSwitchStart, timeoutMs = SWITCH_CHAIN_TIMEOUT_MS } = options
    signal?.throwIfAborted()
    const chainId = network.chain_id
    if (chainId == null || chainId === '') {
        return
    }
    if (!ensureChain && !needsChainSwitch(wallet, network)) {
        return
    }

    const event = {
        ...context,
        stage: 'network_switch' as const,
        path,
        action: `switch_to_${chainId}`,
        provider: wallet.providerName,
    }
    let switching = false
    const start = () => {
        signal?.throwIfAborted()
        if (switching) return
        switching = true
        onLifecycle({ ...event, step: 'network_switch_started', outcome: 'started' })
        onSwitchStart?.()
    }
    try {
        if (ensureChain) {
            // The adapter owns live state, cancellation and its single deadline.
            await ensureChain(wallet, chainId, { signal, onSwitchStart: start })
        } else {
            // Compatibility for providers that only implement the legacy switch API.
            if (!switchChain) {
                onLifecycle({ ...event, step: 'network_switch_started', outcome: 'started' })
                throw new Error(`${wallet.providerName} cannot switch networks`)
            }
            start()
            await withTimeout(switchChain(wallet, chainId), timeoutMs, () => new Error(`Timed out switching to ${network.display_name}`))
        }
        signal?.throwIfAborted()
    } catch (error) {
        signal?.throwIfAborted()
        const rejected = isUserRejection(error)
        const details = lifecycleErrorDetails(error)
        onLifecycle({
            ...event,
            ...details,
            step: rejected ? 'network_switch_rejected' : 'network_switch_failed',
            outcome: rejected ? 'rejected' : 'failed',
            reasonCode: rejected ? 'user_rejected' : details.reasonCode,
        })
        throw new NetworkSwitchError(network, classifyFailure(rejected, details.reasonCode), error)
    }
    if (switching) onLifecycle({ ...event, step: 'network_switched', outcome: 'succeeded' })
}
