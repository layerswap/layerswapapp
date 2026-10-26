import { Buffer } from 'node:buffer'
import type { NextApiRequest, NextApiResponse } from 'next'

export const config = { api: { bodyParser: { sizeLimit: '5mb' } } }

const MAX_BATCH_RECORDS = 1000
const MAX_BATCH_BYTES = 5 * 1024 * 1024

const signalTypes = {
    logs: 'log',
    events: 'event',
    exceptions: 'exception',
    measurements: 'measurement',
} as const

// Axiom expands nested objects into columns. Keep query dimensions bounded and
// store full diagnostic envelopes as JSON strings, never as a second field tree.
const QUERY_ATTRIBUTES = [
    'step', 'stage', 'outcome', 'reason_code', 'error_code', 'occurrence_id',
    'sequence', 'attempt', 'journey_duration_ms', 'previous_step_duration_ms',
    'operation', 'operation_id', 'duration_ms', 'http_status', 'flow_id',
    'source_network', 'destination_network', 'source_token', 'destination_token',
    'deposit_method', 'requested_amount', 'amount_mode', 'provider', 'status',
    'phase', 'action', 'path', 'wallet_balance', 'wallet_balance_network',
    'wallet_balance_token', 'wallet_balance_timestamp',
] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value)

// These fields are outside QUERY_ATTRIBUTES, but must not create nested columns either.
function queryString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length <= 256 ? value : undefined
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
    if (process.env.NEXT_PUBLIC_TELEMETRY_PROVIDER !== 'axiom') {
        res.status(404).end()
        return
    }
    res.setHeader('Cache-Control', 'no-store')
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST')
        res.status(405).end()
        return
    }

    // The browser posts JSON from this app; do not accept writes from other sites.
    if (req.headers['sec-fetch-site'] === 'cross-site') {
        res.status(403).end()
        return
    }
    if (req.headers.origin) {
        try {
            if (new URL(req.headers.origin).host !== req.headers.host) {
                res.status(403).end()
                return
            }
        }
        catch {
            res.status(403).end()
            return
        }
    }
    if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
        res.status(415).end()
        return
    }

    const token = process.env.AXIOM_TOKEN
    const dataset = process.env.AXIOM_DATASET
    const edge = process.env.AXIOM_EDGE || 'https://us-east-1.aws.edge.axiom.co'
    if (!token || !dataset || !['https://us-east-1.aws.edge.axiom.co', 'https://eu-central-1.aws.edge.axiom.co'].includes(edge)) {
        res.status(503).json({ error: 'Axiom is not configured' })
        return
    }

    const body: unknown = req.body
    if (!isRecord(body) || !isRecord(body.meta)) {
        res.status(400).end()
        return
    }
    const receivedAt = new Date().toISOString()
    const records: string[] = []
    let outputBytes = 0
    // Metadata is repeated per record, so the request size does not bound output.
    const addRecord = (type: string, payload: Record<string, unknown>): boolean => {
        if (records.length >= MAX_BATCH_RECORDS) return false
        const session = isRecord(body.meta) && isRecord(body.meta.session) ? body.meta.session : {}
        const attributes = isRecord(payload.attributes) ? payload.attributes : {}
        const context = isRecord(session.attributes) ? session.attributes : {}
        const dimensions: Record<string, string | number | boolean> = {}
        for (const key of QUERY_ATTRIBUTES) {
            const value = attributes[key]
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                dimensions[key] = value
            }
        }
        const timestamp = typeof payload.timestamp === 'string' && Number.isFinite(Date.parse(payload.timestamp))
            ? payload.timestamp : receivedAt
        const record = JSON.stringify({
            ...dimensions,
            journey_id: queryString(attributes.journey_id ?? context.journey_id),
            swap_id: queryString(attributes.swap_id ?? context.swap_id),
            _time: timestamp, received_at: receivedAt, type,
            name: queryString(payload.name), session_id: queryString(session.id),
            payload_json: JSON.stringify(payload), meta_json: JSON.stringify(body.meta),
        })
        outputBytes += Buffer.byteLength(record, 'utf8') + 1
        if (outputBytes > MAX_BATCH_BYTES) return false
        records.push(record)
        return true
    }
    for (const [key, type] of Object.entries(signalTypes)) {
        const signals = body[key]
        if (signals === undefined) continue
        if (!Array.isArray(signals)) {
            res.status(400).end()
            return
        }
        if (records.length + signals.length > MAX_BATCH_RECORDS) {
            res.status(413).end()
            return
        }
        for (const payload of signals) {
            if (!isRecord(payload)) {
                res.status(400).end()
                return
            }
            if (!addRecord(type, payload)) {
                res.status(413).end()
                return
            }
        }
    }
    if (body.traces !== undefined) {
        if (!isRecord(body.traces)) {
            res.status(400).end()
            return
        }
        if (!addRecord('trace', body.traces)) {
            res.status(413).end()
            return
        }
    }
    if (!records.length) {
        res.status(400).end()
        return
    }

    try {
        const upstream = await fetch(`${edge}/v1/ingest/${encodeURIComponent(dataset)}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: `[${records.join(',')}]`,
            signal: AbortSignal.timeout(10_000),
            redirect: 'error',
        })
        if (!upstream.ok) {
            const rejection = await upstream.json().catch(() => ({}))
            const columnLimit = typeof rejection.message === 'string' && rejection.message.includes('column limit')
            console.error('[Axiom] Upstream rejected telemetry', { status: upstream.status, records: records.length, columnLimit })
            res.status(upstream.status === 429 || upstream.status === 430 ? 429 : 502).json({
                error: 'Axiom rejected telemetry', upstream_status: upstream.status,
                reason: columnLimit ? 'dataset_column_limit' : 'upstream_rejection',
            })
            return
        }
        const result = await upstream.json()
        if (result.failed !== 0 || result.ingested !== records.length) {
            console.error('[Axiom] Incomplete ingestion', { ingested: result.ingested, failed: result.failed, expected: records.length })
            res.status(502).json({ error: 'Axiom did not accept the complete batch', ingested: result.ingested, failed: result.failed })
            return
        }
        res.status(204).end()
    }
    catch (error) {
        // Never log payloads, credentials, upstream bodies, or error messages with URLs.
        const failure = error instanceof Error ? error.name : 'UnknownError'
        console.error('[Axiom] Ingestion connection or response failed', { failure })
        res.status(502).json({ error: 'Axiom ingestion connection or response failed', failure })
    }
}
