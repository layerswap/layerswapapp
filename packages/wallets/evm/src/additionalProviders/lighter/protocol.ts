/**
 * Shared Lighter protocol module — imported by BOTH the browser flow and the
 * bridge's relay route (`apps/bridge/pages/api/lighter/relay.ts`) via the
 * `@layerswap/wallet-evm/lighter-protocol` subpath, so the two sides cannot drift.
 *
 * Deliberately dependency-free (same discipline as the Polymarket `protocol.ts`):
 * no `@layerswap/widget/*` import, so pulling it into a Next API route does not drag
 * React and the widget bundle onto the server. That is why the Lighter network names
 * are inlined literals here rather than read from `KnownInternalNames` — the
 * widget-aware `./routes` builds on top of these.
 */

// The node API client is dependency-free for the same reason and travels with this
// module, so the relay route gets config + client from one subpath import.
export {
    LighterApiError,
    LighterClient,
    isLighterOk,
    lighterAccountIndex,
} from "./lighterClient"
export type {
    LighterAccount,
    LighterApiKey,
    LighterFastWithdrawalInfo,
    LighterResultResponse,
    SignedLighterTx,
} from "./lighterClient"

export const LIGHTER_MAINNET_NETWORK = 'LIGHTER_MAINNET'
export const LIGHTER_TESTNET_NETWORK = 'LIGHTER_TESTNET'

export const LIGHTER_USDC_SYMBOL = 'USDC'
export const LIGHTER_USDC_DECIMALS = 6

export type LighterChain = 'Mainnet' | 'Testnet'

/** Lighter protocol chain IDs (not EVM chain IDs) — confirmed against lighter-go. */
export const LIGHTER_PROTOCOL_CHAIN_ID: Record<LighterChain, number> = { Mainnet: 304, Testnet: 300 }

/** Lighter protocol constants, confirmed against lighter-go and the live testnet. */
export const LIGHTER_USDC_ASSET_INDEX = 3
export const LIGHTER_PERPS_ROUTE_TYPE = 0

// Lighter only reveals the account-specific fast-withdraw fee after API-key
// authorization, so the route quotes this estimate up front. Preflight replaces it
// with the exact fee before the swap is created (see ../README.md).
export const LIGHTER_QUOTED_FAST_WITHDRAW_FEE_USDC = 1
/** Lighter's fast-withdraw minimum, applied to the TOTAL debit (before the fee is taken out). */
export const LIGHTER_FAST_WITHDRAW_MIN_USDC = 4
/** Lighter's USDC L2 transfer minimum, applied to the net amount that reaches the bridge. */
export const LIGHTER_USDC_MIN_TRANSFER_USDC = 1

export type LighterNetwork = {
    lighterChain: LighterChain
    defaultNodeUrl: string
}

export const LIGHTER_NETWORKS: Record<string, LighterNetwork> = {
    [LIGHTER_MAINNET_NETWORK]: {
        lighterChain: 'Mainnet',
        defaultNodeUrl: 'https://mainnet.zklighter.elliot.ai',
    },
    [LIGHTER_TESTNET_NETWORK]: {
        lighterChain: 'Testnet',
        defaultNodeUrl: 'https://testnet.zklighter.elliot.ai',
    },
}

function registrableDomain(hostname: string): string {
    return hostname.toLowerCase().split('.').slice(-2).join('.')
}

/**
 * Constrain a settings-supplied `node_url` override to the trusted Lighter domain.
 * An attacker-controlled override would otherwise feed forged balances and fees into
 * the flow, so anything that isn't HTTPS on the same registrable domain falls back
 * to the route default.
 */
function allowedNodeUrl(override: string | undefined, defaultNodeUrl: string): string {
    if (!override) return defaultNodeUrl
    try {
        const candidate = new URL(override)
        const trusted = new URL(defaultNodeUrl)
        if (candidate.protocol !== 'https:') return defaultNodeUrl
        if (registrableDomain(candidate.hostname) !== registrableDomain(trusted.hostname)) return defaultNodeUrl
        return override
    } catch {
        return defaultNodeUrl
    }
}

export function resolveLighterNodeUrl(networkName: string, override?: string): string | undefined {
    const network = LIGHTER_NETWORKS[networkName]
    if (!network) return undefined
    return allowedNodeUrl(override, network.defaultNodeUrl)
}

export function resolveLighterChain(networkName: string): LighterChain | undefined {
    return LIGHTER_NETWORKS[networkName]?.lighterChain
}

export function isLighterNetwork(networkName: string | undefined): boolean {
    return !!networkName && !!LIGHTER_NETWORKS[networkName]
}
