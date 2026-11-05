import type { NextApiRequest, NextApiResponse } from 'next';
import { getSettings } from '@layerswap/widget';
import { AppSettings, LayerswapApiClient } from '@layerswap/widget/internal';

// Finish server work before the browser's ten-second probe timeout.
const UPSTREAM_TIMEOUT = 8_000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Both healthy and unavailable probes must reach the backend on every retry.
    res.setHeader('Cache-Control', 'private, no-store');
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).end();
    }

    const controller = new AbortController();
    const abort = () => controller.abort();
    const timeout = setTimeout(abort, UPSTREAM_TIMEOUT);
    res.once('close', abort);

    try {
        const app = req.query.appName || req.query.addressSource;
        const apiKeys = JSON.parse(process.env.API_KEYS || '{}');
        const apiKey = (typeof app === 'string' ? apiKeys[app] : undefined) || process.env.NEXT_PUBLIC_API_KEY;
        LayerswapApiClient.apiKey = apiKey;
        LayerswapApiClient.apiBaseEndpoint = process.env.NEXT_PUBLIC_LS_API || AppSettings.LayerswapApiUri;

        // The swap detail page only depends on networks; a route-list outage
        // must not prevent that page from recovering.
        const settings = req.query.scope === 'networks'
            ? await new LayerswapApiClient().GetLSNetworksAsync({ signal: controller.signal }).then(result => ({ networks: result.data }))
            : await getSettings(apiKey, { includeFeatureFlags: false, signal: controller.signal });

        if (res.destroyed) {
            return;
        }

        // Optional exchanges can fall back to empty data after cancellation.
        // An expired probe must not trigger a reload into an unbounded SSR fetch.
        if (!controller.signal.aborted && settings?.networks?.length) {
            return res.status(204).end();
        }
    } catch {
        // Readiness is only a status: do not return API keys or backend errors.
    } finally {
        clearTimeout(timeout);
        res.off('close', abort);
        // Promise.all can fail before the other settings requests finish.
        // Cancel those remaining requests too, rather than removing their deadline.
        controller.abort();
    }

    if (!res.destroyed) {
        res.setHeader('Retry-After', '15');
        return res.status(503).end();
    }
}
