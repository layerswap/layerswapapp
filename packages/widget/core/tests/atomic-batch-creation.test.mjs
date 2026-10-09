import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { JSDOM } from 'jsdom'
import React, { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { createSwapContext } from './helpers/swap-context.mjs'

const dom = new JSDOM('<div id="root"></div>', { url: 'https://widget.example' })
const previous = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document,
    localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true })) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
after(() => {
    dom.window.close()
    for (const key of ['window', 'document', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT']) {
        if (previous[key]) Object.defineProperty(globalThis, key, previous[key]); else delete globalThis[key]
    }
})
function pure(path) {
    const output = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    const module = { exports: {} }
    new Function('module', 'exports', output)(module, module.exports)
    return module.exports
}
const fixture = JSON.parse(readFileSync(new URL('./fixtures/atomic-batch.json', import.meta.url)))
const store = state => Object.assign(selector => selector(state), { getState: () => state })
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve() }

async function setup({ capability = async () => 'supported', gasless = false, native = false, depositAddress = false, coordination = true } = {}) {
    let update, state, wallet = { id: 'Selected', providerName: 'EVM', address: fixture.account, addresses: [fixture.account],
        asSourceSupportedNetworks: [fixture.network.name], chainId: 42161 }
    let outstanding
    const requests = [], checks = []
    const preferences = { gaslessEnabled: gasless }
    const network = fixture.network
    const settings = { sourceRoutes: [], destinationRoutes: [], networks: [network] }
    const token = { ...fixture.token, contract: native ? null : fixture.token.contract,
        supports_gasless_deposit: true, gasless_standard: 'eip3009' }
    const values = { from: network, to: network, fromAsset: token, toAsset: { symbol: 'AAVE' },
        destination_address: fixture.account, amount: '1', depositMethod: depositAddress ? 'deposit_address' : 'wallet' }
    const context = createSwapContext({
        Client: class { CreateSwapAsync = async data => { requests.push(data); return { data: { swap: { id: 'created' }, quote: {} } } } },
        getSwapId: () => undefined, getAccount: () => wallet,
        overrides: {
            '@/hooks/useWallet': { default: () => ({ wallets: [wallet] }) },
            './settings': { useInitialSettings: () => ({}), useSettingsState: () => settings },
            '@/helpers/atomicBatch': pure('../src/helpers/atomicBatch.ts'),
            '@/helpers/gasless': pure('../src/helpers/gasless.ts'),
            '@/helpers/swapFlow': pure('../src/helpers/swapFlow.ts'),
            '@/stores/contractAddressStore': { useContractAddressStore: () => ({ checkContractStatus: async () => ({ sourceIsContract: false }) }) },
            '@/stores/gaslessPreferenceStore': { useGaslessPreferenceStore: store(preferences) },
            '@/stores/atomicBatchStore': { useAtomicBatchStore: store({ batches: {} }), getAtomicBatch: id => outstanding?.swapId === id ? outstanding : undefined, supportsWebLocks: () => coordination },
            '@/lib/extendedRoutes/registry': { resolveExtendedRoutePlan: () => undefined },
            '@/lib/resolvers/resolverService': { resolverService: { getTransferResolver: () => ({ getAtomicBatchProvider: () => ({
                getCapabilities: async ctx => { checks.push(ctx); return capability(ctx) },
            }) }) } },
            '@/lib/swapLifecycle': { lifecycleContextFromForm: () => ({}) },
            '@/lib/swapCreation': { createSwapAttempt: async prepare => (await (await prepare()).request()).data },
            '@layerswap/utils': { KnownInternalNames: { Networks: {} } },
        },
    })
    function Read() { update = context.useSwapDataUpdate(); state = context.useSwapDataState(); return null }
    const root = createRoot(document.getElementById('root'))
    const render = () => act(() => root.render(createElement(context.SwapDataProvider, null, createElement(Read))))
    await render()
    await act(() => update.setSubmitedFormValues(values))
    return { requests, checks, values, preferences, get update() { return update }, get state() { return state }, root,
        changeWallet: async changes => { wallet = { ...wallet, ...changes }; await render() },
        block: () => { outstanding = { swapId: 'unresolved' } } }
}

for (const capability of ['supported', 'ready', 'unsupported']) test(`creation opts in only for ${capability} capability`, async () => {
    const h = await setup({ capability: async () => capability })
    try {
        await act(async () => { await h.update.createSwap(h.values, {}) })
        assert.equal(h.checks.length, 1)
        assert.equal(h.requests[0].use_atomic_batch, capability === 'supported' ? true : undefined)
        assert.equal(h.requests[0].use_gasless, false)
        assert.equal(h.requests[0].use_frontend_swap, true)
    } finally { await act(() => h.root.unmount()) }
})

for (const mode of ['native', 'gasless', 'depositAddress']) test(`${mode} creation omits the atomic flag`, async () => {
    const h = await setup({ [mode]: true })
    try {
        await act(async () => { await h.update.createSwap(h.values, {}) })
        assert.equal(h.checks.length, 0)
        assert.equal(h.requests[0].use_atomic_batch, undefined)
    } finally { await act(() => h.root.unmount()) }
})

for (const change of ['account', 'chain', 'mode', 'away-and-back']) test(`stale ${change} change aborts creation before the API request`, async () => {
    let resolve
    const h = await setup({ capability: () => new Promise(done => { resolve = done }) })
    try {
        let pending
        await act(async () => { pending = h.update.createSwap(h.values, {}); await flush() })
        assert.equal(h.checks.length, 1)
        if (change === 'account') await h.changeWallet({ address: `0x${'4'.repeat(40)}`, addresses: [`0x${'4'.repeat(40)}`] })
        if (change === 'chain') await h.changeWallet({ chainId: 1 })
        if (change === 'mode') h.preferences.gaslessEnabled = true
        if (change === 'away-and-back') {
            await h.changeWallet({ chainId: 1 })
            await h.changeWallet({ chainId: 42161 })
        }
        resolve('supported')
        await assert.rejects(pending, /changed/)
        assert.equal(h.requests.length, 0)
    } finally { await act(() => h.root.unmount()) }
})

test('an unrelated wallet request does not block fresh swap creation', async () => {
    const h = await setup()
    try {
        h.block()
        await h.update.createSwap(h.values, {})
        await act(() => h.update.startFreshSwapAttempt())
        assert.equal(h.requests.length, 1)
    } finally { await act(() => h.root.unmount()) }
})

test('switching source routes refreshes creation with stable wallet, account and settings references', async () => {
    const h = await setup()
    const nextNetwork = { ...fixture.network, name: 'BASE_MAINNET', chain_id: '8453' }
    try {
        await h.changeWallet({ chainId: 8453, asSourceSupportedNetworks: [fixture.network.name, nextNetwork.name] })
        const previousCreate = h.update.createSwap
        const values = { ...h.values, from: nextNetwork }
        await act(() => h.update.setSubmitedFormValues(values))
        assert.notEqual(h.update.createSwap, previousCreate)
        await act(async () => { await h.update.createSwap(values, {}) })
        assert.equal(h.requests.length, 1)
        assert.equal(h.requests[0].source_network, nextNetwork.name)
        assert.equal(h.requests[0].use_atomic_batch, true)
    } finally { await act(() => h.root.unmount()) }
})

test('creation keeps the ordinary rail when the browser cannot coordinate batches', async () => {
    const h = await setup({ coordination: false })
    try {
        await act(async () => { await h.update.createSwap(h.values, {}) })
        assert.equal(h.checks.length, 0)
        assert.equal(h.requests[0].use_atomic_batch, undefined)
    } finally { await act(() => h.root.unmount()) }
})
