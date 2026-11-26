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

const ADAPTERS = {
    '@tronweb3/tronwallet-adapter-metamask-tron': 'MetaMaskAdapter',
    '@tronweb3/tronwallet-adapter-tronlink': 'TronLinkAdapter',
    '@tronweb3/tronwallet-adapter-okxwallet': 'OkxWalletAdapter',
    '@tronweb3/tronwallet-adapter-bitkeep': 'BitKeepAdapter',
    '@tronweb3/tronwallet-adapter-bybit': 'BybitWalletAdapter',
    '@tronweb3/tronwallet-adapter-gatewallet': 'GateWalletAdapter',
    '@tronweb3/tronwallet-adapter-trust': 'TrustAdapter',
}

// Mirrors webpack: an import joins the chunk's pending request; a settled
// failure is cleared so the next import fetches again.
function chunkLoader(plans) {
    const pending = new Map()
    const fetches = new Map()
    const require = name => {
        if (pending.has(name)) return pending.get(name)
        const attempt = fetches.get(name) ?? 0
        fetches.set(name, attempt + 1)
        const { after, fail } = (plans[name] ?? [{ after: 50 }])[attempt] ?? { after: 50 }
        const request = new Promise((resolve, reject) => setTimeout(() => {
            pending.delete(name)
            if (fail) reject(Object.assign(new Error(`Loading chunk ${name} failed.`), { name: 'ChunkLoadError' }))
            else resolve({ [ADAPTERS[name]]: class { name = ADAPTERS[name] } })
        }, after))
        pending.set(name, request)
        return request
    }
    return { require, fetches }
}

test('staggered chunk failures each get a fresh attempt before adapters register', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const hadWindow = 'window' in globalThis
    if (!hadWindow) globalThis.window = {}
    t.after(() => { if (!hadWindow) delete globalThis.window })

    const metamask = '@tronweb3/tronwallet-adapter-metamask-tron'
    const tronLink = '@tronweb3/tronwallet-adapter-tronlink'
    const { require: loadChunk, fetches } = chunkLoader({
        [metamask]: [{ after: 100, fail: true }, { after: 100 }],
        [tronLink]: [{ after: 800, fail: true }, { after: 100 }],
    })
    const register = t.mock.fn()
    const { retryChunkLoad } = load('../../../core/src/lib/retryChunkLoad.ts', () => ({}))
    const { initTronProvider } = load('../src/init.ts', name => {
        if (name === '@layerswap/wallet-core') return { retryChunkLoad }
        if (name === './service/tronAdapterManager') return { tronAdapterManager: { register } }
        if (name in ADAPTERS) return loadChunk(name)
        throw new Error(`Unexpected dependency: ${name}`)
    })

    initTronProvider()
    for (let elapsed = 0; elapsed < 2000; elapsed += 50) {
        await new Promise(resolve => setImmediate(resolve))
        t.mock.timers.tick(50)
    }
    await new Promise(resolve => setImmediate(resolve))

    assert.equal(fetches.get(metamask), 2)
    assert.equal(fetches.get(tronLink), 2)
    assert.equal(register.mock.callCount(), 1)
    assert.deepEqual(register.mock.calls[0].arguments[0].map(adapter => adapter.name), Object.values(ADAPTERS))
})
