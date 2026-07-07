import { erc20Abi, BaseError, ContractFunctionRevertedError, type PublicClient } from "viem";
import { derivePolymarketDepositWallet, derivePolymarketProxy, derivePolymarketSafe } from "./derive";
import { POLYMARKET_GAMMA_API_URL, POLYMARKET_PROFILE_TIMEOUT_MS, POLYMARKET_PUSD_ADDRESS, POLYMARKET_PUSD_DECIMALS, POLYMARKET_USDC_E_ADDRESS } from "./constants";

/**
 * Polymarket holds a user's collateral in a funder wallet derived from their owner
 * EOA — but the funder TYPE varies by account: the modern ERC-1967 **deposit wallet**
 * (default today), a legacy Gnosis **Safe** (browser-wallet logins), or a custom
 * **proxy** (email/Magic logins). The collateral token is usually **pUSD** but older
 * balances may still be **USDC.e**. So to find a user's balance we can't assume one
 * address or one token — we derive every candidate and read both tokens, and use
 * whichever actually holds funds.
 *
 * Local CREATE2 derivation only reproduces addresses for the contract versions whose
 * constants are hardcoded. Legacy account vintages use older funder contracts we can't
 * re-derive, so those balances would be silently missed. To cover them we also ask
 * Polymarket for the account's authoritative `proxyWallet` (`fetchPolymarketProfileWallet`)
 * and read its balance too; when that address isn't one of the derived (classifiable)
 * candidates it's tagged `'unknown'` — visible as balance, but not withdrawable until its
 * funder type is supported.
 */

export type PolymarketHolderType = 'deposit' | 'safe' | 'proxy' | 'unknown'

export type PolymarketCandidate = { type: PolymarketHolderType; address: `0x${string}` }

export type PolymarketHoldingEntry = {
    type: PolymarketHolderType
    address: `0x${string}`
    tokenSymbol: 'pUSD' | 'USDC.e'
    tokenAddress: `0x${string}`
    decimals: number
    raw: bigint
    amount: number
}

export type PolymarketHolding = {
    candidates: PolymarketCandidate[]
    entries: PolymarketHoldingEntry[]
    /** Human total across all candidates/tokens — the displayed balance. */
    total: number
    /** The single largest holding — the address/token a withdrawal should move from. */
    primary?: PolymarketHoldingEntry
}

/** Derive all candidate funder addresses for an owner EOA, ordered modern-first. */
export function polymarketCandidates(eoa: string): PolymarketCandidate[] {
    return [
        { type: 'deposit', address: derivePolymarketDepositWallet(eoa) },
        { type: 'safe', address: derivePolymarketSafe(eoa) },
        { type: 'proxy', address: derivePolymarketProxy(eoa) },
    ]
}

/**
 * The account's authoritative funder address from Polymarket's public profile, or `null`
 * if the owner has no Polymarket account (404) or the lookup fails. Best-effort by design:
 * never throws, so a slow/absent Gamma API degrades gracefully to derivation-only balance
 * discovery. Returned lowercased for case-insensitive comparison against derived addresses.
 */
export async function fetchPolymarketProfileWallet(eoa: string): Promise<`0x${string}` | null> {
    try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), POLYMARKET_PROFILE_TIMEOUT_MS)
        const res = await fetch(`${POLYMARKET_GAMMA_API_URL}/public-profile?address=${eoa}`, {
            headers: { accept: 'application/json' },
            signal: controller.signal,
        }).finally(() => clearTimeout(timer))
        if (!res.ok) return null // 404 = no Polymarket account for this owner
        const data = await res.json() as { proxyWallet?: string }
        const pw = data?.proxyWallet
        return typeof pw === 'string' && /^0x[0-9a-fA-F]{40}$/.test(pw) ? pw.toLowerCase() as `0x${string}` : null
    } catch {
        return null
    }
}

/**
 * All funder candidates to check for an owner EOA: the locally-derived set plus, when
 * Polymarket reports one that we can't re-derive, the authoritative profile wallet tagged
 * `'unknown'`. Deduped by address (the profile wallet usually equals the derived `safe`).
 */
export async function resolvePolymarketCandidates(eoa: string): Promise<PolymarketCandidate[]> {
    const derived = polymarketCandidates(eoa)
    const profileWallet = await fetchPolymarketProfileWallet(eoa)
    if (profileWallet && !derived.some(c => c.address.toLowerCase() === profileWallet)) {
        return [{ type: 'unknown', address: profileWallet }, ...derived]
    }
    return derived
}

const TOKENS: { symbol: 'pUSD' | 'USDC.e'; address: `0x${string}`; decimals: number }[] = [
    { symbol: 'pUSD', address: POLYMARKET_PUSD_ADDRESS, decimals: POLYMARKET_PUSD_DECIMALS },
    { symbol: 'USDC.e', address: POLYMARKET_USDC_E_ADDRESS, decimals: 6 },
]

/**
 * Read pUSD + USDC.e across every derived funder candidate and report where the funds
 * are. `total` is the displayed balance; `primary` is the source a withdrawal pulls from.
 */
export async function resolvePolymarketHolding(eoa: string, publicClient: PublicClient): Promise<PolymarketHolding> {
    const candidates = await resolvePolymarketCandidates(eoa)

    const reads = candidates.flatMap(c => TOKENS.map(t => ({ candidate: c, token: t })))
    const results = await Promise.all(reads.map(async ({ candidate, token }) => {
        try {
            const raw = await publicClient.readContract({
                address: token.address,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [candidate.address],
            }) as bigint
            return { candidate, token, raw }
        } catch (err) {
            if (err instanceof BaseError && err.walk(e => e instanceof ContractFunctionRevertedError)) {
                return { candidate, token, raw: 0n }
            }
            throw err
        }
    }))

    const entries: PolymarketHoldingEntry[] = results
        .filter(r => r.raw > 0n)
        .map(r => ({
            type: r.candidate.type,
            address: r.candidate.address,
            tokenSymbol: r.token.symbol,
            tokenAddress: r.token.address,
            decimals: r.token.decimals,
            raw: r.raw,
            amount: Number(r.raw) / 10 ** r.token.decimals,
        }))

    const total = entries.reduce((sum, e) => sum + e.amount, 0)
    const primary = entries.reduce<PolymarketHoldingEntry | undefined>(
        (best, e) => (!best || e.raw > best.raw ? e : best),
        undefined,
    )

    return { candidates, entries, total, primary }
}
