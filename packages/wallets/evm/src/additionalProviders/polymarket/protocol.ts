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

/**
 * On-chain contract constants shared with the relay proxy's request validation
 * (`apps/bridge/lib/polymarket/validateRelaySubmit.ts`). Pure literals only —
 * client-only constants stay in `./constants`, which re-exports these for
 * existing importers.
 */

/** pUSD (Polymarket USD) collateral token on Polygon. Verified on-chain (the funder's
 * balance + the bridge quote both recognise this address). */
export const POLYMARKET_PUSD_ADDRESS = '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB' as `0x${string}`

/** USDC.e on Polygon — Flow 2's intermediate token. pUSD unwraps to USDC.e 1:1, and
 * some legacy Polymarket collateral is already held as USDC.e (balances read both). */
export const POLYMARKET_USDC_E_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as `0x${string}`

/** Polymarket CollateralOfframp on Polygon. Permissionless 1:1 unwrap of pUSD → the
 * asset address passed (we pass USDC.e). Verified on-chain:
 * `unwrap(address _asset, address _to, uint256 _amount)` (nonpayable, not a proxy). */
export const POLYMARKET_COLLATERAL_OFFRAMP = '0x2957922Eb93258b93368531d39fAcCA3B4dC5854' as `0x${string}`

export const POLYMARKET_OFFRAMP_ABI = [
    {
        type: 'function',
        name: 'unwrap',
        stateMutability: 'nonpayable',
        inputs: [
            { name: '_asset', type: 'address' },
            { name: '_to', type: 'address' },
            { name: '_amount', type: 'uint256' },
        ],
        outputs: [],
    },
] as const

/** Polymarket Gnosis Safe MultiSend on Polygon, from `getContractConfig(137)` in
 * `@polymarket/builder-relayer-client`. Re-verify if the SDK config changes. */
export const POLYMARKET_SAFE_MULTISEND = '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761' as `0x${string}`
export const MULTISEND_ABI = [
    {
        type: 'function',
        name: 'multiSend',
        stateMutability: 'payable',
        inputs: [{ name: 'transactions', type: 'bytes' }],
        outputs: [],
    },
] as const

/** Deposit-wallet factory (the modern ERC-1967 account funder — the default for
 * current Polymarket accounts). From getContractConfig(137). */
export const POLYMARKET_DEPOSIT_WALLET_FACTORY = '0x00000000000Fb5C9ADea0298D729A0CB3823Cc07' as `0x${string}`

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
