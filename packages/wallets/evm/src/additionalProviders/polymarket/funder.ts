import { erc20Abi, BaseError, ContractFunctionRevertedError, ContractFunctionZeroDataError, type PublicClient } from "viem";
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
    /** Entries with `'unknown'` funders already classified on-chain where possible. */
    entries: PolymarketHoldingEntry[]
    /** Informational human total across all candidates/tokens, INCLUDING funders that
     * cannot be driven through a withdrawal path (proxy/unknown). */
    total: number
    /** The most a single withdrawal can actually pull: a withdrawal executes against ONE
     * deposit/safe entry, so this is the largest executable entry's amount — not a sum.
     * Spendable balance must be displayed/validated against this, never `total`: balances
     * of 60 + 40 make `total` 100 while an 80 withdrawal is impossible. */
    maxExecutable: number
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

/** ERC-5267: reveals a contract's EIP-712 domain (name/version) without a signature. */
const EIP5267_ABI = [{
    type: 'function', name: 'eip712Domain', stateMutability: 'view', inputs: [],
    outputs: [
        { name: 'fields', type: 'bytes1' },
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
        { name: 'salt', type: 'bytes32' },
        { name: 'extensions', type: 'uint256[]' },
    ],
}] as const

const OWNER_ABI = [{
    type: 'function', name: 'owner', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }],
}] as const

/** EIP-712 domain name a Polymarket deposit wallet reports via `eip712Domain()`. Its
 * batch signature (see `buildDepositWalletBatchRequest`) uses this exact domain, so any
 * on-chain wallet reporting it — including legacy factory/implementation vintages the
 * local derivation can't reproduce — is drivable through the deposit-wallet path. */
const DEPOSIT_WALLET_DOMAIN_NAME = 'DepositWallet'

/** Session cache of conclusive on-chain classifications, keyed by owner + funder address.
 * A funder's contract code never changes, so once a probe conclusively answers, re-probing
 * on every balance poll only burns RPC calls. Inconclusive probes (transport/RPC failures)
 * are NOT cached — a flaky node must not permanently misclassify a withdrawable funder. */
const classificationCache = new Map<string, PolymarketHolderType>()

type ProbeOutcome = { value: unknown; conclusive: boolean }

/** Run a view read, reporting whether a failure is a definitive on-chain answer (revert /
 * no code — the address genuinely doesn't expose the function) or a transport problem
 * that may succeed on retry. */
async function probeRead(read: () => Promise<unknown>): Promise<ProbeOutcome> {
    try {
        return { value: await read(), conclusive: true }
    } catch (err) {
        const definitive = err instanceof BaseError && !!err.walk(e =>
            e instanceof ContractFunctionRevertedError || e instanceof ContractFunctionZeroDataError)
        return { value: null, conclusive: definitive }
    }
}

/**
 * Classify a funder address we couldn't derive/classify locally by inspecting it on-chain.
 * A deposit wallet exposes ERC-5267 `eip712Domain()` = "DepositWallet" and `owner()` = the
 * signer; when both hold for the connected EOA it's withdrawable via the deposit-wallet path
 * regardless of which factory/implementation version deployed it. Anything else (a Magic
 * proxy whose owner key we don't hold, an unrecognized contract) stays `'unknown'`. Never
 * throws — a failed probe degrades to `'unknown'` (unsupported), never a wrong classification.
 * Conclusive results are cached for the session (contract code is immutable), so repeated
 * balance polls don't re-probe the chain.
 */
export async function classifyPolymarketFunder(
    address: `0x${string}`,
    eoa: string,
    publicClient: PublicClient,
): Promise<PolymarketHolderType> {
    const cacheKey = `${eoa.toLowerCase()}:${address.toLowerCase()}`
    const cached = classificationCache.get(cacheKey)
    if (cached) return cached
    try {
        const [domain, owner] = await Promise.all([
            probeRead(() => publicClient.readContract({ address, abi: EIP5267_ABI, functionName: 'eip712Domain' })),
            probeRead(() => publicClient.readContract({ address, abi: OWNER_ABI, functionName: 'owner' })),
        ])
        const name = Array.isArray(domain.value) ? domain.value[1] : undefined
        const ownedByEoa = typeof owner.value === 'string' && owner.value.toLowerCase() === eoa.toLowerCase()
        const type: PolymarketHolderType =
            name === DEPOSIT_WALLET_DOMAIN_NAME && ownedByEoa ? 'deposit' : 'unknown'
        if (type === 'deposit' || (domain.conclusive && owner.conclusive)) {
            classificationCache.set(cacheKey, type)
        }
        return type
    } catch {
        return 'unknown'
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
 * Resolve `'unknown'`-typed entries to their real funder type via on-chain probes
 * (deduped by address, in parallel). Shared by balance discovery and withdrawal
 * selection so both see the same classification.
 */
export async function classifyUnknownEntries(
    entries: PolymarketHoldingEntry[],
    eoa: string,
    publicClient: PublicClient,
): Promise<PolymarketHoldingEntry[]> {
    const unknownAddresses = [...new Set(entries.filter(e => e.type === 'unknown').map(e => e.address))]
    if (unknownAddresses.length === 0) return entries
    const classified = new Map(await Promise.all(unknownAddresses.map(async address =>
        [address, await classifyPolymarketFunder(address, eoa, publicClient)] as const
    )))
    return entries.map(e => e.type === 'unknown' ? { ...e, type: classified.get(e.address) ?? 'unknown' } : e)
}

/**
 * Read pUSD + USDC.e across every derived funder candidate and report where the funds
 * are. `maxExecutable` is the spendable balance; `total` is informational; a withdrawal
 * picks its source from `entries` with `selectPolymarketFunder`.
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

    const rawEntries: PolymarketHoldingEntry[] = results
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

    // Classify at discovery (not only at withdrawal) so `maxExecutable` counts a
    // profile-reported funder that probes as a deposit wallet. Only funders that
    // actually hold a balance are probed, so the extra reads stay minimal.
    const entries = await classifyUnknownEntries(rawEntries, eoa, publicClient)

    const total = entries.reduce((sum, e) => sum + e.amount, 0)
    const maxExecutable = entries.reduce(
        (max, e) => (e.type === 'deposit' || e.type === 'safe') && e.amount > max ? e.amount : max,
        0,
    )
    return { candidates, entries, total, maxExecutable }
}

/** A holding entry whose funder type can actually be driven through a withdrawal path. */
export type PolymarketExecutableEntry = PolymarketHoldingEntry & { type: 'deposit' | 'safe' }

export type PolymarketFunderSelection = {
    /** Entries withdrawable after classification (deposit/safe), largest-raw first. Empty
     * means every funder holding a balance is an unsupported type (proxy/unknown). */
    executable: PolymarketExecutableEntry[]
    /** The largest executable entry covering `amountBaseUnits`, or `undefined` when
     * executable entries exist but none holds enough. */
    selected?: PolymarketExecutableEntry
}

/**
 * Pick the funder a withdrawal should pull from: classify `'unknown'` entries on-chain
 * (in parallel; a funder surfaced via Polymarket's profile may turn out to be a deposit
 * wallet), keep only executable types, and select the largest entry that covers the
 * requested amount — so an unsupported proxy holding more than a withdrawable funder
 * never blocks a withdrawal the withdrawable funder could serve.
 */
export async function selectPolymarketFunder(
    entries: PolymarketHoldingEntry[],
    amountBaseUnits: bigint,
    eoa: string,
    publicClient: PublicClient,
): Promise<PolymarketFunderSelection> {
    const classifiedEntries = await classifyUnknownEntries(entries, eoa, publicClient)

    const executable = classifiedEntries
        .filter((e): e is PolymarketExecutableEntry => e.type === 'deposit' || e.type === 'safe')
        .sort((a, b) => (a.raw < b.raw ? 1 : a.raw > b.raw ? -1 : 0))

    // Sorted largest-first, so the first entry covering the amount is the largest one.
    const selected = executable.find(e => e.raw >= amountBaseUnits)
    return { executable, selected }
}
