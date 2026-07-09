import { flag } from 'flags/next'
import { vercelAdapter } from '@flags-sdk/vercel'
import type { GetServerSidePropsContext } from 'next'
import type { ExtendedRouteFlags } from '@layerswap/widget/types'

// Kill switches for the client-synthesized extended source routes, backed by Vercel
// Flags (hosted). Create these two flags in the Vercel dashboard's Flags section and
// toggle them per-environment there — changes take effect at runtime, no redeploy.
// `defaultValue: true` is the fallback when the service is unreachable / unauthenticated
// (e.g. local dev without `vercel env pull`), keeping routes on by default.
export const hyperliquidRoutesFlag = flag<boolean>({
    key: 'hyperliquid-routes',
    description: 'Show Hyperliquid extended source routes',
    defaultValue: true,
    adapter: vercelAdapter(),
})

export const polymarketRoutesFlag = flag<boolean>({
    key: 'polymarket-routes',
    description: 'Show Polymarket extended source routes (requires builder credentials)',
    defaultValue: true,
    adapter: vercelAdapter(),
})

export const extendedRouteFlags = {
    hyperliquid: hyperliquidRoutesFlag,
    polymarket: polymarketRoutesFlag,
}

// Polymarket routes go through a builder-key-authed relayer proxy; without those server
// secrets the flow can't complete, so this is a hard prerequisite ANDed on top of the
// dashboard toggle — the route can't be enabled from the dashboard alone.
export const hasPolymarketBuilderCreds = () =>
    !!process.env.POLYMARKET_BUILDER_API_KEY &&
    !!process.env.POLYMARKET_BUILDER_SECRET &&
    !!process.env.POLYMARKET_BUILDER_PASSPHRASE

// Effective Polymarket enablement = dashboard flag AND builder creds present. Shared by
// the source-route resolver and the relayer proxy so both gate identically.
export async function isPolymarketEnabled(req: GetServerSidePropsContext['req']): Promise<boolean> {
    return (await polymarketRoutesFlag(req)) && hasPolymarketBuilderCreds()
}

// Resolve every extended-route flag for a request — call from getServerSideProps with
// `context.req`.
export async function resolveExtendedRouteFlags(req: GetServerSidePropsContext['req']): Promise<ExtendedRouteFlags> {
    const [hyperliquid, polymarket] = await Promise.all([
        hyperliquidRoutesFlag(req),
        isPolymarketEnabled(req),
    ])
    return { hyperliquid, polymarket }
}
