import type { NextApiRequest, NextApiResponse } from 'next';
import { getSettings } from '@layerswap/widget';
import { AppSettings, LayerswapApiClient } from '@layerswap/widget/internal';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Both healthy and unavailable probes must reach the backend on every retry.
    res.setHeader('Cache-Control', 'private, no-store');
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).end();
    }

    try {
        const app = req.query.appName || req.query.addressSource;
        const apiKeys = JSON.parse(process.env.API_KEYS || '{}');
        const apiKey = (typeof app === 'string' ? apiKeys[app] : undefined) || process.env.NEXT_PUBLIC_API_KEY;
        LayerswapApiClient.apiKey = apiKey;
        LayerswapApiClient.apiBaseEndpoint = process.env.NEXT_PUBLIC_LS_API || AppSettings.LayerswapApiUri;

        // The swap detail page only depends on networks; a route-list outage
        // must not prevent that page from recovering.
        const settings = req.query.scope === 'networks'
            ? await new LayerswapApiClient().GetLSNetworksAsync().then(result => ({ networks: result.data }))
            : await getSettings(apiKey, { includeFeatureFlags: false });

        if (settings?.networks?.length) {
            return res.status(204).end();
        }
    } catch {
        // Readiness is only a status: do not return API keys or backend errors.
    }

    res.setHeader('Retry-After', '15');
    return res.status(503).end();
}
