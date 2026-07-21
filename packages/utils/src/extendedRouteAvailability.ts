import type { Token } from "@/types"

export type DepositRouteRef = { networkName: string; tokenSymbol: string }

type RouteLike = {
    name: string
    deposit_methods?: string[]
    tokens?: Pick<Token, 'symbol' | 'status'>[]
}

/**
 * True if `routes` contains a backend route that can fulfill the given real
 * (network, token) as a deposit-address source — i.e. the extended route can
 * actually be bridged through it. Used both as the plan-resolution guard and as
 * the per-candidate availability check that drives destination fallback.
 */
export function realDepositAddressRoutePresent(routes: RouteLike[], real: DepositRouteRef): boolean {
    return routes.some(r =>
        r.name === real.networkName
        && r.deposit_methods?.includes('deposit_address')
        && r.tokens?.some(t => t.symbol === real.tokenSymbol && t.status === 'active'))
}
