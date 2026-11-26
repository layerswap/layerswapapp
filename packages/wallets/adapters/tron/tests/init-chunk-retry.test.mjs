import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

function load(path, require) {
    const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', outputText)(require, module, module.exports)
    return module.exports
}

const SHARED_CHUNK = 'tron-adapter-shared'
const ADAPTERS = {
    '@tronweb3/tronwallet-adapter-metamask-tron': 'MetaMaskAdapter',
    '@tronweb3/tronwallet-adapter-tronlink': 'TronLinkAdapter',
    '@tronweb3/tronwallet-adapter-okxwallet': 'OkxWalletAdapter',
    '@tronweb3/tronwallet-adapter-bitkeep': 'BitKeepAdapter',
    '@tronweb3/tronwallet-adapter-bybit': 'BybitWalletAdapter',
    '@tronweb3/tronwallet-adapter-gatewallet': 'GateWalletAdapter',
    '@tronweb3/tronwallet-adapter-trust': 'TrustAdapter',
}
const METAMASK = '@tronweb3/tronwallet-adapter-metamask-tron'
const TRONLINK = '@tronweb3/tronwallet-adapter-tronlink'

// Mirrors webpack: each adapter import loads its own chunk plus a chunk shared
// by every adapter. Loaded chunks are never fetched again, imports join a
// chunk's pending request, and a failure is cleared so the next import refetches.
function chunkLoader(plans) {
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

    const importAdapter = name => {
        const exportName = ADAPTERS[name]
        return Promise.all([loadChunk(name), loadChunk(SHARED_CHUNK)])
            .then(() => ({ [exportName]: class { name = exportName } }))
    }

    return { importAdapter, fetches }
}

async function runTronInit(t, plans) {
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

    const { importAdapter, fetches } = chunkLoader(plans)
    const register = t.mock.fn()
    const { retryChunkLoad } = load('../../../core/src/lib/retryChunkLoad.ts', () => ({}))
    const { initTronProvider } = load('../src/init.ts', name => {
        if (name === '@layerswap/wallet-core') {
            return { retryChunkLoad }
        }
        if (name === './service/tronAdapterManager') {
            return { tronAdapterManager: { register } }
        }
        if (name in ADAPTERS) {
            return importAdapter(name)
        }
        throw new Error(`Unexpected dependency: ${name}`)
    })

    initTronProvider()
    for (let elapsed = 0; elapsed < 2000; elapsed += 50) {
        await new Promise(resolve => setImmediate(resolve))
        t.mock.timers.tick(50)
    }
    await new Promise(resolve => setImmediate(resolve))

    return { fetches, register }
}

function assertAllAdaptersRegistered(register) {
    assert.equal(register.mock.callCount(), 1)
    assert.deepEqual(register.mock.calls[0].arguments[0].map(adapter => adapter.name), Object.values(ADAPTERS))
}

test('staggered chunk failures each get a fresh attempt before adapters register', async t => {
    const { fetches, register } = await runTronInit(t, {
        [METAMASK]: [{ after: 100, fail: true }, { after: 100 }],
        [TRONLINK]: [{ after: 800, fail: true }, { after: 100 }],
    })

    assert.equal(fetches.get(METAMASK), 2)
    assert.equal(fetches.get(TRONLINK), 2)
    assertAllAdaptersRegistered(register)
})

test('a failed shared chunk is fetched once more for every adapter waiting on it', async t => {
    const { fetches, register } = await runTronInit(t, {
        [SHARED_CHUNK]: [{ after: 100, fail: true }, { after: 100 }],
    })

    assert.equal(fetches.get(SHARED_CHUNK), 2)
    for (const name of Object.keys(ADAPTERS)) {
        assert.equal(fetches.get(name), 1, `${name} chunk is not refetched`)
    }
    assertAllAdaptersRegistered(register)
})
