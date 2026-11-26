import { readFileSync } from 'node:fs'
import ts from 'typescript'

/** Loads a TypeScript source file as CommonJS, resolving every import through `require`. */
export function loadSource(url, require) {
    const { outputText } = ts.transpileModule(readFileSync(url, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', outputText)(require, module, module.exports)
    return module.exports
}

function rejectImports(name) {
    throw new Error(`Unexpected dependency: ${name}`)
}

/** Fresh copies of the real wallet-core modal store and chunk retry, so state never leaks between tests. */
export function loadWalletCore() {
    const { retryChunkLoad } = loadSource(new URL('../../src/lib/retryChunkLoad.ts', import.meta.url), rejectImports)
    const { connectModalStore } = loadSource(new URL('../../src/lib/walletConnect/connectModalStore.ts', import.meta.url), rejectImports)
    return { retryChunkLoad, connectModalStore }
}

/**
 * Mirrors webpack chunk loading: loaded chunks are never fetched again,
 * imports join a chunk's pending request, and a failure is cleared so the
 * next import refetches. `plans[chunk][attempt]` sets each fetch's timing and
 * outcome; unplanned fetches succeed after 50 ms.
 */
export function createChunkLoader(plans = {}) {
    const installed = new Set()
    const pending = new Map()
    const fetches = new Map()

    const loadChunk = chunk => {
        if (installed.has(chunk)) {
            return Promise.resolve()
        }
        if (pending.has(chunk)) {
            return pending.get(chunk)
        }
        const attempt = fetches.get(chunk) ?? 0
        fetches.set(chunk, attempt + 1)
        const plan = plans[chunk]?.[attempt] ?? { after: 50 }
        const request = new Promise((resolve, reject) => {
            setTimeout(() => {
                pending.delete(chunk)
                if (plan.fail) {
                    reject(Object.assign(new Error(`Loading chunk ${chunk} failed.`), { name: 'ChunkLoadError' }))
                } else {
                    installed.add(chunk)
                    resolve()
                }
            }, plan.after)
        })
        pending.set(chunk, request)
        return request
    }

    return { loadChunk, fetches }
}

/** Enables mocked timers and the browser globals the adapter init code checks for. */
export function useBrowserTestEnvironment(t) {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const hadWindow = 'window' in globalThis
    if (!hadWindow) {
        globalThis.window = {}
    }
    t.after(() => {
        if (!hadWindow) {
            delete globalThis.window
        }
    })
}

/** Advances mocked time in small steps, letting promise chains settle between steps. */
export async function advance(t, ms, step = 50) {
    for (let elapsed = 0; elapsed < ms; elapsed += step) {
        await new Promise(resolve => setImmediate(resolve))
        t.mock.timers.tick(step)
    }
    await new Promise(resolve => setImmediate(resolve))
}
