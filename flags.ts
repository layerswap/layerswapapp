import { flag, evaluate } from 'flags/next'
import type { GetServerSidePropsContext } from 'next'
import type { ExtendedRouteFlags } from '@/lib/extendedRoutes/types'

// Kill switches for the client-synthesized extended source routes. Keys match the
// provider ids in lib/extendedRoutes/registry.ts. On by default: an unset env var
// (or a decide error) leaves the route visible; set the var to 'false' to hide it.
export const hyperliquidRoutesFlag = flag<boolean>({
    key: 'hyperliquid-routes',
    description: 'Show Hyperliquid extended source routes',
    defaultValue: true,
    decide: () => process.env.FLAG_HYPERLIQUID_ROUTES !== 'false',
})

export const polymarketRoutesFlag = flag<boolean>({
    key: 'polymarket-routes',
    description: 'Show Polymarket extended source routes',
    defaultValue: true,
    decide: () => process.env.FLAG_POLYMARKET_ROUTES !== 'false',
})

export const extendedRouteFlags = {
    hyperliquid: hyperliquidRoutesFlag,
    polymarket: polymarketRoutesFlag,
}

// Evaluate every extended-route flag in one pass (shared header/cookie/override
// read) — call from getServerSideProps with `context.req`.
export async function resolveExtendedRouteFlags(req: GetServerSidePropsContext['req']): Promise<ExtendedRouteFlags> {
    return evaluate(extendedRouteFlags, req)
}
