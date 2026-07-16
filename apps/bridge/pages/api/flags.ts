import type { NextApiRequest, NextApiResponse } from "next";
import { resolveExtendedRouteFlags } from "../../flags";

/**
 * Public flags endpoint for clients that have no SSR flag resolution — the CDN
 * React/vanilla embeds and deposit integrations fetch this from the widget's
 * `getSettings()` (see `packages/widget/src/lib/extendedRoutes/remoteFlags.ts`).
 *
 * Returns the same `ExtendedRouteFlags` the bridge injects into its SSR settings,
 * resolved through `resolveExtendedRouteFlags` — so an embed reads exactly the
 * verdict the relayer proxy will enforce (`isPolymarketEnabled` ANDs the dashboard
 * flag with the builder-credential prerequisite).
 *
 * CDN-cached for 60s: a dashboard kill-switch flip reaches every embed within
 * ~a minute without each pageview hitting the flag service.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Embeds run on third-party origins.
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Max-Age", "86400");
    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET, OPTIONS");
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const flags = await resolveExtendedRouteFlags(req);
        res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
        return res.status(200).json(flags);
    } catch (e) {
        console.error("[api/flags] failed to resolve extended-route flags", e);
        // No caching on errors. Clients treat a failed fetch as "no flags" and fall
        // back to each provider's `enabledByDefault` (fail-closed for Polymarket).
        res.setHeader("Cache-Control", "no-store");
        return res.status(500).json({ error: "Flags unavailable" });
    }
}
