import { KnownInternalNames } from "@layerswap/widget/internal";

/**
 * Static configuration for the Polymarket extended withdrawal source.
 *
 * Polymarket holds user funds as pUSD (its collateral token) on Polygon, inside a
 * funder wallet (deposit wallet / Safe / proxy) deterministically derived from the
 * owner EOA. Flow 2 withdrawal: the user signs ONE gasless batch that unwraps pUSD →
 * USDC.e 1:1 via the permissionless CollateralOfframp, then deposits USDC.e into the
 * Layerswap Depository (`depositERC20`) — all broadcast by the Polymarket relayer. The
 * backend detects the depository `Deposited` event and bridges to the final destination.
 */

/** Symbol shown for the Polymarket source token. Polymarket holds collateral as pUSD,
 * so the picker/balance/quote surfaces read 'pUSD'. Only the shown label is pUSD — the
 * token's chain metadata is cloned from Polygon USDC (POLYMARKET_BASE_TOKEN_SYMBOL) and
 * the real backend route is still fulfilled in USDC.e. */
export const POLYMARKET_DISPLAY_SYMBOL = 'pUSD'

/** Real Polygon token whose metadata (logo, decimals, USD price) the synthesized
 * Polymarket source token clones from. Must be a token the backend Polygon network
 * actually defines — hence USDC, not the shown 'pUSD'. */
export const POLYMARKET_BASE_TOKEN_SYMBOL = KnownInternalNames.Currencies.USDC

/** Polygon — the only chain Polymarket collateral lives on, and the bridge/funder chain. */
export const POLYMARKET_CHAIN_ID = 137

/**
 * pUSD (Polymarket USD) collateral token on Polygon. Verified on-chain (the funder's
 * balance + the bridge quote both recognise this address).
 */
export const POLYMARKET_PUSD_ADDRESS = '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB' as `0x${string}`
export const POLYMARKET_PUSD_DECIMALS = 6

/** Native USDC on Polygon. Retained for reference; `unwrap` can also target this. */
export const POLYMARKET_USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as `0x${string}`
export const POLYMARKET_USDC_DECIMALS = 6

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

/** Polymarket relayer base URL (used server-side by the relay proxy; the builder
 * API key never leaves the server). Overridable via `POLYMARKET_RELAYER_URL` env. */
export const POLYMARKET_RELAYER_URL = 'https://relayer-v2.polymarket.com'

/** Polymarket public Gamma API. `GET /public-profile?address=<ownerEoa>` returns the
 * account's authoritative `proxyWallet`. We need this because legacy account vintages
 * use funder contracts our fixed-constant CREATE2 derivation can't reproduce, so the
 * derived candidates miss the real balance. CORS is open (`*`), so it's read directly
 * from the browser during balance discovery — no relayer/server hop. */
export const POLYMARKET_GAMMA_API_URL = 'https://gamma-api.polymarket.com'
/** Timeout for the best-effort public-profile lookup. Kept short: a slow/absent profile
 * must never stall or break the on-chain balance read, which falls back to derivation. */
export const POLYMARKET_PROFILE_TIMEOUT_MS = 4000

/**
 * Polymarket Gnosis Safe contracts on Polygon, from `getContractConfig(137)` in
 * `@polymarket/builder-relayer-client`. Inlined so derivation/signing import only
 * from the package root. SafeFactory matches the on-chain Polymarket Safe Proxy
 * Factory (0xaacFeEa…3541b). Re-verify if the SDK config changes.
 */
export const POLYMARKET_SAFE_FACTORY = '0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b' as `0x${string}`
export const POLYMARKET_SAFE_MULTISEND = '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761' as `0x${string}`
/** Custom proxy factory (MagicLink/email account funders). Used only to detect proxy-held
 * balances so we can surface an "unsupported account" message — the email/Magic owner key
 * can't be connected through the app's wallet connectors, so proxy withdrawal isn't offered. */
export const POLYMARKET_PROXY_FACTORY = '0xaB45c5A4B0c941a2F231C04C3f49182e1A254052' as `0x${string}`
/** Deposit-wallet factory + implementation (the modern ERC-1967 account funder —
 * the default for current Polymarket accounts). From getContractConfig(137). */
export const POLYMARKET_DEPOSIT_WALLET_FACTORY = '0x00000000000Fb5C9ADea0298D729A0CB3823Cc07' as `0x${string}`
export const POLYMARKET_DEPOSIT_WALLET_IMPLEMENTATION = '0x58CA52ebe0DadfdF531Cde7062e76746de4Db1eB' as `0x${string}`

/**
 * Absolute URL of our Next.js relayer proxy. The Polymarket relayer requires a builder
 * API key (server secret) on `/submit`, so all relayer I/O is funneled through this route.
 * Absolute (not a relative path) so it always resolves to the canonical deployment,
 * independent of the app's basePath or the embedding page's origin. See
 * `apps/bridge/pages/api/polymarket/relay.ts`.
 */
export const POLYMARKET_RELAYER_PROXY_URL = 'https://layerswap.io/app/api/polymarket/relay'

/** Typical completion time added to the quote, in seconds. The unwrap+deposit batch
 * confirms on-chain, then the backend detects the depository deposit. */
export const POLYMARKET_ARRIVAL_SECONDS = 5

/** Deposit-wallet batch signature validity window, in seconds. */
export const POLYMARKET_BATCH_DEADLINE_SECONDS = 600
/** Polling for a just-deployed deposit wallet to appear on-chain. */
export const POLYMARKET_DEPLOY_POLL_INTERVAL_MS = 2000
export const POLYMARKET_DEPLOY_POLL_TIMEOUT_MS = 60000

/** Display identity for the synthesized Polymarket source network (see
 * `./polymarketExtendedRouteProvider`). Local asset under /public — avoids
 * next/image remote-host allowlisting and the SVG optimizer restriction. Can be
 * swapped for a Layerswap-CDN asset once one is added. */
export const POLYMARKET_DISPLAY_NAME = 'Polymarket'
export const POLYMARKET_LOGO = '/images/polymarket.png'

export type PolymarketConfig = {
    networkName: string
    /** Real backend network the withdrawal is fulfilled through (Polygon). */
    realNetworkName: string
    /** Real backend source token. USDC.e — pUSD unwraps to it 1:1 and the depository
     * deposit (`depositERC20`) is denominated in it. The displayed source token stays
     * `POLYMARKET_DISPLAY_SYMBOL` ('pUSD'); only the backend route uses this. */
    realTokenSymbol: string
    realDecimals: number
    flatFee: number
    arrivalSeconds: number
}

export const POLYMARKET_CONFIG: Record<string, PolymarketConfig> = {
    [KnownInternalNames.Networks.PolymarketMainnet]: {
        networkName: KnownInternalNames.Networks.PolymarketMainnet,
        realNetworkName: KnownInternalNames.Networks.PolygonMainnet,
        realTokenSymbol: KnownInternalNames.Currencies.USDCe,
        realDecimals: POLYMARKET_USDC_DECIMALS,
        flatFee: 0,
        arrivalSeconds: POLYMARKET_ARRIVAL_SECONDS,
    },
}

export function resolvePolymarketConfig(networkName: string | undefined): PolymarketConfig | undefined {
    if (!networkName) return undefined
    return POLYMARKET_CONFIG[networkName]
}
