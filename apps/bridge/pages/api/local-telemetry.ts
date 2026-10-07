import { Buffer } from 'node:buffer'
import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value)

// Serialize writes so concurrent tabs cannot interleave large batches.
let pendingWrite: Promise<void> = Promise.resolve()

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
    if (process.env.NODE_ENV !== 'development') {
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
        const record = JSON.stringify({ receivedAt, type, payload, meta: body.meta })
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

    // Next.js excludes .next from its watchers. Writing under the source tree
    // feeds Fast Refresh console messages back into another rebuild.
    const directory = join(process.cwd(), '.next', 'local-logs')
    const write = pendingWrite.then(async () => {
        await mkdir(directory, { recursive: true })
        await appendFile(join(directory, 'browser.jsonl'), records.join('\n') + '\n', { mode: 0o600 })
    })
    pendingWrite = write.catch(() => {})
    try {
        await write
        res.status(204).end()
    }
    catch (error) {
        console.error('[Telemetry] Could not append browser.jsonl', error)
        res.status(500).json({ error: 'Could not write local telemetry' })
    }
}
