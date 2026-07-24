import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyAccess, type ProviderData } from 'flags'
import { getProviderData } from '@flags-sdk/vercel'
import { extendedRouteFlags } from '../../../flags'

// Flags discovery endpoint for the Vercel Flags Explorer / dashboard. Reached via a
// rewrite from /.well-known/vercel/flags (see next.config.js). Gated by FLAGS_SECRET —
// without it, verifyAccess returns false and the definitions stay private.
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ProviderData | { error: string }>,
) {
    const access = await verifyAccess(req.headers.authorization)
    if (!access) {
        res.status(401).json({ error: 'Unauthorized' })
        return
    }

    res.status(200).json(await getProviderData(extendedRouteFlags))
}
