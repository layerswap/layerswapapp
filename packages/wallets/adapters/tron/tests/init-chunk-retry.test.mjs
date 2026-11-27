import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

function loadSource(path, require) {
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
const METAMASK = '@tronweb3/tronwallet-adapter-metamask-tron'
const TRONLINK = '@tronweb3/tronwallet-adapter-tronlink'

test('staggered chunk failures each get a fresh attempt before adapters register', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    globalThis.window ??= {}

    // Like webpack, an import joins its chunk's in-flight request instead of fetching again.
    const failFirstFetchAfter = { [METAMASK]: 100, [TRONLINK]: 800 }
    const fetches = {}
    const inFlight = {}
    const importAdapter = name => {
        if (inFlight[name]) {
            return inFlight[name]
        }
        fetches[name] = (fetches[name] ?? 0) + 1
        const fails = fetches[name] === 1 && name in failFirstFetchAfter
        inFlight[name] = new Promise((resolve, reject) => {
            setTimeout(() => {
                delete inFlight[name]
                if (fails) {
                    reject(Object.assign(new Error(`Loading chunk ${name} failed.`), { name: 'ChunkLoadError' }))
                } else {
                    resolve({ [ADAPTERS[name]]: class { name = ADAPTERS[name] } })
                }
            }, fails ? failFirstFetchAfter[name] : 50)
        })
        return inFlight[name]
    }

    const register = t.mock.fn()
    const { retryChunkLoad } = loadSource('../../../core/src/lib/chunkLoadRecovery.ts', () => ({}))
    const { initTronProvider } = loadSource('../src/init.ts', name => {
        if (name === '@layerswap/wallet-core/chunkLoadRecovery') {
            return { retryChunkLoad }
        }
        if (name === './service/tronAdapterManager') {
            return { tronAdapterManager: { register } }
        }
        return importAdapter(name)
    })

    const loaded = initTronProvider()
    for (let elapsed = 0; elapsed < 2000; elapsed += 50) {
        await new Promise(resolve => setImmediate(resolve))
        t.mock.timers.tick(50)
    }
    await loaded

    assert.equal(fetches[METAMASK], 2)
    assert.equal(fetches[TRONLINK], 2)
    assert.equal(register.mock.callCount(), 1)
    assert.deepEqual(register.mock.calls[0].arguments[0].map(adapter => adapter.name), Object.values(ADAPTERS))
})
