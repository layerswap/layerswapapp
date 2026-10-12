import type { Network, SwapLifecycleEvent, Wallet } from '@layerswap/widget-types'
import { lifecycleErrorDetails, type SwapLifecycleContext } from '@/lib/swapLifecycle'
import { isUserRejection } from './isUserRejection'

type ChainSwitcher = (wallet: Wallet, chainId: string | number) => Promise<void>

/**
 * Why the wallet did not end up on the source chain. `pending` and `timeout` are stalls
 * rather than refusals: the wallet is still showing the prompt (a second tap while it is
 * open answers "already pending"), or it never answered at all.
 */
type NetworkSwitchFailure = 'rejected' | 'pending' | 'timeout' | 'failed'

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
 * Some injected providers (e.g. the Binance in-app browser) never settle a
 * `wallet_switchEthereumChain` request the user dismisses natively, which would leave
 * the send flow waiting forever.
 */
const SWITCH_CHAIN_TIMEOUT_MS = 60_000

/**
 * Only wallets that report their current chain (EVM, Fuel) can sit on the wrong one; the
 * others report none. wagmi reports numeric ids while the API serves strings, hence the
 * loose comparison.
 */
export const needsChainSwitch = (wallet: Pick<Wallet, 'chainId'>, network: Pick<Network, 'chain_id'>): boolean =>
    !!wallet.chainId && !!network.chain_id && wallet.chainId != network.chain_id

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
    /** Swap identity merged into every lifecycle event. */
    context: SwapLifecycleContext
    path: string
    onLifecycle: (event: SwapLifecycleEvent) => void
    /** Runs once a switch turns out to be needed, right before the wallet prompt. */
    onSwitchStart?: () => void
    /** How long to wait for the wallet's answer; defaults to SWITCH_CHAIN_TIMEOUT_MS. */
    timeoutMs?: number
}

/**
 * Brings the wallet onto the swap's source chain before the first wallet request. wagmi
 * refuses to send on a chain the wallet is not on and wallets reject typed-data domains
 * for another chain, so the send button runs this instead of showing a standalone
 * "Switch network" step. Resolves at once when no switch is needed; otherwise reports
 * the attempt and throws a `NetworkSwitchError` when the wallet does not end up switched.
 */
export async function ensureSourceChain(options: EnsureSourceChainOptions): Promise<void> {
    const { wallet, network, switchChain, context, path, onLifecycle, onSwitchStart, timeoutMs = SWITCH_CHAIN_TIMEOUT_MS } = options
    const chainId = network.chain_id
    if (!chainId || !needsChainSwitch(wallet, network)) return

    const event = {
        ...context,
        stage: 'network_switch' as const,
        path,
        action: `switch_to_${chainId}`,
        provider: wallet.providerName,
    }
    onLifecycle({ ...event, step: 'network_switch_started', outcome: 'started' })
    try {
        if (!switchChain) throw new Error(`${wallet.providerName} cannot switch networks`)
        onSwitchStart?.()
        // The message is what the shared wallet error classifier reads as `timeout`.
        await withTimeout(switchChain(wallet, chainId), timeoutMs, () => new Error(`Timed out switching to ${network.display_name}`))
    } catch (error) {
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
    onLifecycle({ ...event, step: 'network_switched', outcome: 'succeeded' })
}
