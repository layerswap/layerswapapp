/**
 * Shared client/server protocol for the Polymarket relayer.
 *
 * Imported by BOTH sides of the proxy hop:
 *   - the wallet package's `relayerClient` (browser), which builds submissions, and
 *   - the bridge's `api/polymarket/relay` route (server), which validates and
 *     forwards them with builder auth.
 *
 * Keeping the URL, submit-type union, and type guard in one module means a new or
 * renamed request variant cannot compile on one side and fail at runtime on the
 * other. This file must stay dependency-free (no viem/react/node imports): the
 * server route consumes it via the `@layerswap/wallet-evm/polymarket-protocol`
 * subpath precisely so it never drags the wallet package's runtime graph.
 */

/** Polymarket relayer base URL (used server-side by the relay proxy; the builder
 * API key never leaves the server). Overridable via `POLYMARKET_RELAYER_URL` env. */
export const POLYMARKET_RELAYER_URL = 'https://relayer-v2.polymarket.com'

/** Machine-readable body the relay proxy returns when the Polymarket kill switch is
 * off (dashboard flag disabled or builder creds missing). Clients map it to
 * user-facing "temporarily unavailable" copy. */
export const PROVIDER_DISABLED_CODE = 'provider_disabled'

/** Every request `type` the relayer `/submit` accepts. */
export const RELAYER_SUBMIT_TYPES = ['SAFE', 'WALLET', 'WALLET-CREATE'] as const

export type RelayerSubmitType = typeof RELAYER_SUBMIT_TYPES[number]

/** A single call inside a deposit-wallet batch. */
export type DepositWalletCall = { target: string; value: string; data: string }

/** Gnosis-Safe relayer request (`/submit`). */
export type SafeTransactionRequest = {
    type: 'SAFE'
    from: string
    to: string
    proxyWallet: string
    data: string
    nonce: string
    signature: string
    signatureParams: {
        gasPrice: string
        operation: string
        safeTxnGas: string
        baseGas: string
        gasToken: string
        refundReceiver: string
    }
    metadata?: string
}

/** Deposit-wallet batch relayer request (`/submit`). */
export type DepositWalletBatchRequest = {
    type: 'WALLET'
    from: string
    to: string
    nonce: string
    signature: string
    depositWalletParams: { depositWallet: string; deadline: string; calls: DepositWalletCall[] }
}

/** Deposit-wallet deploy request (`/submit`, no signature). */
export type DepositWalletCreateRequest = {
    type: 'WALLET-CREATE'
    from: string
    to: string
}

/** Anything the relayer `/submit` accepts. */
export type RelayerSubmittable = SafeTransactionRequest | DepositWalletBatchRequest | DepositWalletCreateRequest

export type RelayerSubmitResponse = {
    transactionID: string
    state: string
    transactionHash?: string
}

/** Structural check that an untrusted body is a plausible relayer submission. */
export function isRelayerSubmittable(value: unknown): value is RelayerSubmittable {
    if (!value || typeof value !== 'object') return false
    const v = value as Record<string, unknown>
    return typeof v.type === 'string'
        && (RELAYER_SUBMIT_TYPES as readonly string[]).includes(v.type)
        && typeof v.from === 'string'
        && typeof v.to === 'string'
}
