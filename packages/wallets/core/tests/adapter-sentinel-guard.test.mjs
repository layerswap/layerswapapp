import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

// Source-scan guard: the rejected UI label (ActionMessageType.TransactionRejected)
// carries no classification, so an adapter that assigns it by hand would show
// "rejected" copy while the host and telemetry see an unclassified failure. The
// only sanctioned producers are the wallet-core helpers; a new adapter written
// against the old `e.name = ...` idiom fails here, in the CI step that already runs.

const adaptersRoot = fileURLToPath(new URL('../../adapters/', import.meta.url))
const SKIP = new Set(['dist', 'node_modules'])
const HAND_ASSIGNED = /\.name\s*=\s*(ActionMessageType\.TransactionRejected|['"]TransactionRejected['"])/
const SENTINEL = /TransactionRejected(?!RpcError)/
const HELPER = /walletActionError\(|userRejectedError\(/

function* sourceFiles(dir) {
    for (const entry of readdirSync(dir)) {
        if (SKIP.has(entry)) continue
        const path = join(dir, entry)
        if (statSync(path).isDirectory()) yield* sourceFiles(path)
        else if (/\.tsx?$/.test(entry)) yield path
    }
}

function* adapterSources() {
    for (const adapter of readdirSync(adaptersRoot)) {
        const src = join(adaptersRoot, adapter, 'src')
        let isDir = false
        try { isDir = statSync(src).isDirectory() } catch { continue }
        if (isDir) yield* sourceFiles(src)
    }
}

test('no adapter assigns the rejected label by hand; every use goes through a wallet-core helper', () => {
    const files = [...adapterSources()]
    assert.ok(files.length > 20, `expected adapter sources under ${adaptersRoot}`)
    const violations = []
    for (const file of files) {
        const lines = readFileSync(file, 'utf8').split('\n')
        lines.forEach((line, index) => {
            const where = `${relative(adaptersRoot, file)}:${index + 1}`
            if (HAND_ASSIGNED.test(line)) violations.push(`${where} assigns the rejected label by hand: ${line.trim()}`)
            else if (SENTINEL.test(line) && !HELPER.test(line)) violations.push(`${where} references the rejected label outside a helper call: ${line.trim()}`)
        })
    }
    assert.deepEqual(violations, [])
})
