import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

function load(path, imports) {
    const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', outputText)(name => {
        assert.ok(name in imports, `Unexpected dependency: ${name}`)
        return imports[name]
    }, module, module.exports)
    return module.exports
}

const { LazyBalanceProvider, LazyGasProvider } = load('../src/resolvers/lazyProviders.ts', {
    './balance': { BalanceProvider: class {} },
})

const chunkError = () => Object.assign(new Error('Loading chunk 5244 failed.'), { name: 'ChunkLoadError' })

function flakyLoader(provider) {
    let attempts = 0
    const loader = async () => {
        attempts += 1
        if (attempts === 1) throw chunkError()
        return provider
    }
    return { loader, attempts: () => attempts }
}

test('a failed balance provider load is retried on the next call', async () => {
    const provider = { fetchBalance: async () => [{ amount: 1 }] }
    const { loader, attempts } = flakyLoader(provider)
    const lazy = new LazyBalanceProvider(() => true, loader)

    await assert.rejects(lazy.fetchBalance('0x1', {}), { name: 'ChunkLoadError' })
    assert.deepEqual(await lazy.fetchBalance('0x1', {}), [{ amount: 1 }])
    assert.deepEqual(await lazy.fetchBalance('0x1', {}), [{ amount: 1 }])
    assert.equal(attempts(), 2)
})

test('a failed gas provider load is retried on the next call', async () => {
    const provider = { getGas: async () => ({ gas: 1 }) }
    const { loader, attempts } = flakyLoader(provider)
    const lazy = new LazyGasProvider(() => true, loader)

    await assert.rejects(lazy.getGas({}), { name: 'ChunkLoadError' })
    assert.deepEqual(await lazy.getGas({}), { gas: 1 })
    assert.equal(attempts(), 2)
})

test('concurrent calls share one in-flight load', async () => {
    let attempts = 0
    const lazy = new LazyBalanceProvider(() => true, async () => {
        attempts += 1
        return { fetchBalance: async () => [] }
    })

    await Promise.all([lazy.fetchBalance('0x1', {}), lazy.fetchBalance('0x2', {}), lazy.fetchBalance('0x3', {})])
    assert.equal(attempts, 1)
})
