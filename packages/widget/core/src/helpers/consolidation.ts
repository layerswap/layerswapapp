import { NetworkType } from '@layerswap/widget-types'
import type { GasWithToken, NetworkBalance, NetworkRoute, NetworkRouteToken } from '@layerswap/widget-types'
import type { ConsolidationSource, SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues'
import type { SwapQuote } from '@/lib/apiClients/layerSwapApiClient'
import { addDecimal } from '@/lib/extendedRoutes/amounts'
import { resolveGasBalanceBudget } from '@/lib/gases/resolveGasBalanceBudget'
import { SwapPhase } from '@/components/utils/swapPhase'

/** Primary source plus extras. */
export const MAX_CONSOLIDATION_SOURCES = 5
export const PRIMARY_ROW_ID = 'primary'

export const consolidationSourceId = (network: string, token: string) => `${network}:${token}`

export const isNativeToken = (route: Pick<NetworkRoute, 'token'>, token: Pick<NetworkRouteToken, 'symbol'>) =>
    route.token?.symbol === token.symbol

/** Feature flag is checked by the caller. */
export function isConsolidationEligibleForm(values: SwapFormValues, sourceAddress: string | undefined): boolean {
    return values.depositMethod === 'wallet'
        && values.from?.type === NetworkType.EVM
        && !!values.fromAsset
        && !!values.to && !!values.toAsset && !!values.destination_address
        && !values.fromExchange
        && !!sourceAddress
}

export function tokenBalanceAmount(balances: Record<string, NetworkBalance> | null | undefined, network: string, token: string): number {
    return balances?.[network]?.balances?.find(b => b.token === token)?.amount ?? 0
}

/** Wallet-deposit EVM routes holding a balance, without the primary source, extended sources or provider-handled withdrawals. */
export function filterEligibleSources({ routes, balances, primary, excluded = [], isExtended, hasWithdrawalProvider }: {
    routes: NetworkRoute[]
    balances: Record<string, NetworkBalance> | null | undefined
    primary: { network?: string, token?: string }
    /** Source ids already in use. */
    excluded?: string[]
    isExtended: (network: string) => boolean
    hasWithdrawalProvider: (route: NetworkRoute) => boolean
}): NetworkRoute[] {
    return routes
        .filter(route => route.type === NetworkType.EVM
            && !!route.deposit_methods?.includes('wallet')
            && !isExtended(route.name)
            && !hasWithdrawalProvider(route))
        .map(route => ({
            ...route,
            tokens: route.tokens.filter(token => !(route.name === primary.network && token.symbol === primary.token)
                && !excluded.includes(consolidationSourceId(route.name, token.symbol))
                && tokenBalanceAmount(balances, route.name, token.symbol) > 0),
        }))
        .filter(route => route.tokens.length > 0)
}

export type ConsolidationDestination = Required<Pick<SwapFormValues, 'to' | 'toAsset' | 'destination_address'>>

/** A complete wallet-deposit form for one leg; refuel is never offered in consolidation. */
export function buildLegFormValues(source: Pick<ConsolidationSource, 'from' | 'fromAsset' | 'amount'>, destination: ConsolidationDestination): SwapFormValues {
    return {
        from: source.from,
        fromAsset: source.fromAsset,
        amount: source.amount,
        to: destination.to,
        toAsset: destination.toAsset,
        destination_address: destination.destination_address,
        depositMethod: 'wallet',
        refuel: false,
        amountMode: 'fixed',
    }
}

export type RowIssueKind = 'no_route' | 'balance' | 'min' | 'max' | 'gas' | 'amount'

export type RowIssue = {
    kind: RowIssueKind
    /** Short pill text, e.g. "Below min". */
    badge?: string
    /** Button / summary text, e.g. "USDT amount below minimum". */
    message: string
    /** Inline row text, e.g. "Below min 10 USDT". */
    detail?: string
}

export type ConsolidationRowReport = {
    id: string
    asset: string
    network: string
    networkDisplayName: string
    amount: string
    isNative: boolean
    priceUsd?: number
    quote?: SwapQuote
    receiveAmount?: number
    minReceiveAmount?: number
    feesUsd?: number
    gas?: Pick<GasWithToken, 'gas' | 'maxFee' | 'reserve'>
    gasUsd?: number
    avgCompletionTime?: string
    balance?: number
    nativeBalance?: number
    nativeSymbol?: string
    minAmount?: number
    maxAmount?: number
    issue?: RowIssue
    loading: boolean
}

/** Row checks in priority order: no route › above balance › below min / above max. Gas is checked per network in the summary. */
export function resolveRowIssue({ asset, network, destinationLabel, amount, routeAvailable, balance, minAmount, maxAmount }: {
    asset: string
    network: string
    destinationLabel: string
    amount: string
    routeAvailable: boolean
    balance?: number
    minAmount?: number
    maxAmount?: number
}): RowIssue | undefined {
    if (!routeAvailable) return { kind: 'no_route', badge: 'No route', message: `No route for ${asset} on ${network}`, detail: `Can't be sent to ${destinationLabel}` }
    const value = Number(amount)
    if (!amount || !Number.isFinite(value) || value <= 0) return { kind: 'amount', message: `Enter ${asset} amount` }
    if (balance != null && value > balance) return { kind: 'balance', badge: 'Low balance', message: `Not enough ${asset} on ${network}`, detail: `Balance ${balance} ${asset}` }
    if (minAmount != null && value < minAmount) return { kind: 'min', badge: 'Below min', message: `${asset} amount below minimum`, detail: `Below min ${minAmount} ${asset}` }
    if (maxAmount != null && value > maxAmount) return { kind: 'max', badge: 'Above max', message: `${asset} amount above maximum`, detail: `Above max ${maxAmount} ${asset}` }
    return undefined
}

export type ConsolidationTotals = { receive: string, minReceive: string, feesUsd: number, gasUsd: number }

export function aggregateConsolidationQuotes(rows: Pick<ConsolidationRowReport, 'receiveAmount' | 'minReceiveAmount' | 'feesUsd' | 'gasUsd'>[], destinationDecimals: number): ConsolidationTotals {
    return rows.reduce<ConsolidationTotals>((totals, row) => ({
        receive: addDecimal(totals.receive, row.receiveAmount ?? 0, destinationDecimals),
        minReceive: addDecimal(totals.minReceive, row.minReceiveAmount ?? row.receiveAmount ?? 0, destinationDecimals),
        feesUsd: totals.feesUsd + (row.feesUsd ?? 0),
        gasUsd: totals.gasUsd + (row.gasUsd ?? 0),
    }), { receive: '0', minReceive: '0', feesUsd: 0, gasUsd: 0 })
}

export type GasShortfall = { network: string, networkDisplayName: string, symbol?: string, required: number, available: number, transfers: number }

/** Estimate: ERC-20 legs count an approval and a deposit; native legs also spend their amount. */
export function resolveGasShortfalls(rows: Pick<ConsolidationRowReport, 'network' | 'networkDisplayName' | 'nativeSymbol' | 'gas' | 'nativeBalance' | 'isNative' | 'amount'>[]): GasShortfall[] {
    const byNetwork = new Map<string, GasShortfall>()
    for (const row of rows) {
        if (!row.gas || row.nativeBalance == null) continue
        const current = byNetwork.get(row.network) ?? {
            network: row.network, networkDisplayName: row.networkDisplayName, symbol: row.nativeSymbol,
            required: 0, available: row.nativeBalance, transfers: 0,
        }
        current.required += resolveGasBalanceBudget(row.gas) * (row.isNative ? 1 : 2)
            + (row.isNative ? Number(row.amount) || 0 : 0)
        current.transfers += 1
        byNetwork.set(row.network, current)
    }
    return [...byNetwork.values()].filter(shortfall => shortfall.required > shortfall.available)
}

export const gasShortfallIssue = (shortfall: GasShortfall): RowIssue => ({
    kind: 'gas', badge: 'No gas', message: `Not enough ${shortfall.symbol ?? 'gas'} on ${shortfall.networkDisplayName} for gas`,
})

export type ConsolidationSummary = {
    active: boolean
    rows: ConsolidationRowReport[]
    /** Each row's blocking issue, with shared-gas shortfalls applied. */
    issues: Record<string, RowIssue | undefined>
    validRows: ConsolidationRowReport[]
    totals: ConsolidationTotals
    gasShortfalls: GasShortfall[]
    firstError?: string
    ready: boolean
    isLoading: boolean
}

export function summarizeConsolidation(reports: Record<string, ConsolidationRowReport>, expectedIds: string[], destinationDecimals: number): ConsolidationSummary {
    const rows = expectedIds.map(id => reports[id]).filter((row): row is ConsolidationRowReport => !!row)
    const gasShortfalls = resolveGasShortfalls(rows.filter(row => !row.issue))
    const issues = Object.fromEntries(rows.map(row => {
        const shortfall = gasShortfalls.find(s => s.network === row.network)
        return [row.id, row.issue ?? (shortfall ? gasShortfallIssue(shortfall) : undefined)]
    }))
    const validRows = rows.filter(row => !issues[row.id])
    const firstError = rows.map(row => issues[row.id]).find(Boolean)?.message
    const isLoading = rows.some(row => row.loading)
    return {
        active: expectedIds.length > 1,
        rows,
        issues,
        validRows,
        totals: aggregateConsolidationQuotes(validRows, destinationDecimals),
        gasShortfalls,
        firstError,
        isLoading,
        ready: rows.length === expectedIds.length && !isLoading && !firstError && rows.every(row => row.receiveAmount != null),
    }
}

/** Groups sources by network, keeping first-seen order, to save wallet network switches. */
export function orderByNetwork<T extends { network: string }>(items: T[]): T[] {
    const networks = [...new Set(items.map(item => item.network))]
    return networks.flatMap(network => items.filter(item => item.network === network))
}

export type ConsolidationLegState = 'pending' | 'submitted' | 'cancelled'

export type LegOutcome = 'delivered' | 'refunded' | 'failed'

export type ConsolidationLeg = {
    id: string
    network: string
    token: string
    amount: string
    swapId?: string
    state: ConsolidationLegState
    /** Last observed terminal result, so a reopened sheet shows it before polling catches up. */
    outcome?: LegOutcome
    received?: number
    /** Bumped when a refunded or failed leg is sent again. */
    attempt?: number
}

export type ConsolidationRecord = {
    id: string
    createdAt: number
    status: 'executing' | 'done'
    sourceAddress: string
    destination: { network: string, token: string, address: string }
    legs: ConsolidationLeg[]
    activeLegId?: string
    stopped: boolean
}

export function buildRecordFromForm(values: SwapFormValues, sourceAddress: string, id: string, now: number): ConsolidationRecord | undefined {
    const { from, fromAsset, amount, to, toAsset, destination_address } = values
    if (!from || !fromAsset || !amount || !to || !toAsset || !destination_address) return undefined
    const sources = orderByNetwork([
        { id: consolidationSourceId(from.name, fromAsset.symbol), from, fromAsset, amount },
        ...(values.extraSources ?? []),
    ].map(source => ({ ...source, network: source.from.name })))
    return {
        id,
        createdAt: now,
        status: 'executing',
        sourceAddress,
        destination: { network: to.name, token: toAsset.symbol, address: destination_address },
        legs: sources.map(source => ({
            id: source.id, network: source.from.name, token: source.fromAsset.symbol, amount: source.amount, state: 'pending',
        })),
        activeLegId: sources[0].id,
        stopped: false,
    }
}

export function nextActiveLeg(legs: ConsolidationLeg[], isAvailable: (leg: ConsolidationLeg) => boolean = () => true): string | undefined {
    return legs.find(leg => leg.state === 'pending' && isAvailable(leg))?.id
}

export function isRecordFinished(record: ConsolidationRecord): boolean {
    return record.legs.every(leg => leg.state !== 'pending')
}

export function rehydrateLeg(leg: Pick<ConsolidationLeg, 'network' | 'token'>, sourceRoutes: NetworkRoute[]): { from: NetworkRoute, fromAsset: NetworkRouteToken } | undefined {
    const from = sourceRoutes.find(route => route.name === leg.network)
    const fromAsset = from?.tokens.find(token => token.symbol === leg.token)
    return from && fromAsset ? { from, fromAsset } : undefined
}

export type LegStatus = 'queued' | 'awaiting_confirmation' | 'unavailable' | 'stopped' | 'submitted' | 'delivered' | 'failed' | 'refunded'

export function phaseOutcome(phase: SwapPhase | undefined): LegOutcome | undefined {
    if (phase === SwapPhase.Completed) return 'delivered'
    if (phase === SwapPhase.Refunded) return 'refunded'
    if (phase === SwapPhase.Failed || phase === SwapPhase.Expired) return 'failed'
    return undefined
}

export function deriveLegStatus({ leg, active, available, phase, submitted }: {
    leg: Pick<ConsolidationLeg, 'state' | 'outcome'>
    active: boolean
    available: boolean
    phase?: SwapPhase
    submitted: boolean
}): LegStatus {
    if (leg.state === 'submitted' || submitted) return phaseOutcome(phase) ?? leg.outcome ?? 'submitted'
    if (leg.state === 'cancelled') return 'stopped'
    if (!available) return 'unavailable'
    return active ? 'awaiting_confirmation' : 'queued'
}
