import { flag } from 'flags/next'
import { vercelAdapter } from '@flags-sdk/vercel'
import type { GetServerSidePropsContext } from 'next'
import type { ExtendedRouteFlags } from '@layerswap/widget/types'

// Kill switches for the client-synthesized extended source routes, backed by Vercel
// Flags (hosted). Create these two flags in the Vercel dashboard's Flags section and
// toggle them per-environment there — changes take effect at runtime, no redeploy.
// `defaultValue` is the fallback when the service is unreachable / unauthenticated
// (e.g. local dev without `vercel env pull`) and is chosen PER FLAG by failure mode:
// fail-open only for routes with no server dependency; fail-closed for routes whose
// flow runs through server credentials.
export const hyperliquidRoutesFlag = flag<boolean>({
    key: 'hyperliquid-routes',
    description: 'Show Hyperliquid extended source routes',
    // Pure client-side route — losing the flag service may keep it on.
    defaultValue: true,
    adapter: vercelAdapter(),
})

export const polymarketRoutesFlag = flag<boolean>({
    key: 'polymarket-routes',
    description: 'Show Polymarket extended source routes (requires builder credentials)',
    // Fail CLOSED: this is an emergency kill switch for a credential-bearing route —
    // loss or misconfiguration of the flag service must not silently re-enable it.
    // Local dev without `vercel env pull` opts in via POLYMARKET_ROUTES_OVERRIDE=true.
    defaultValue: false,
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

// Effective Polymarket enablement = (dashboard flag OR explicit env opt-in) AND builder
// creds present. Shared by the source-route resolver, the public flags endpoint, and the
// relayer proxy so all three gate identically. The env override exists because the flag
// fails closed — it lets local dev / non-Vercel environments turn the route on with
// intent, but never bypasses the credentials prerequisite.
export async function isPolymarketEnabled(req: GetServerSidePropsContext['req']): Promise<boolean> {
    const flagOn = (await polymarketRoutesFlag(req)) || process.env.POLYMARKET_ROUTES_OVERRIDE === 'true'
    return flagOn && hasPolymarketBuilderCreds()
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
