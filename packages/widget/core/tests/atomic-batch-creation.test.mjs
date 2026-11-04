import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { JSDOM } from 'jsdom'
import React, { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import useSWR, { SWRConfig } from 'swr'
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
function pure(path, imports = {}) {
    const output = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    const module = { exports: {} }
    new Function('require', 'module', 'exports', output)(name => {
        if (name in imports) return imports[name]
        if (name === '../components/utils/resolveSwapFlow.js') return pure('../src/components/utils/resolveSwapFlow.ts')
        if (name === '../../helpers/depositActions.js') return pure('../src/helpers/depositActions.ts')
        throw new Error(`Unexpected dependency: ${name}`)
    }, module, module.exports)
    return module.exports
}
const fixture = JSON.parse(readFileSync(new URL('./fixtures/atomic-batch.json', import.meta.url)))
const store = state => Object.assign(selector => selector(state), { getState: () => state })
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve() }

async function setup({ capability = async () => 'supported', gasless = false, native = false, depositAddress = false, existing = false, discover = false, provider = '0X', liveSource = false, submit = true, quoteReady = true, swrDedupingInterval = 2000 } = {}) {
    let update, state, wallet = { id: 'Selected', providerName: 'EVM', address: fixture.account, addresses: [fixture.account],
        asSourceSupportedNetworks: [fixture.network.name], chainId: 42161, isActive: true }
    const requests = [], checks = []
    const resolvers = { resolverService: { getTransferResolver: () => ({ getAtomicBatchProvider: () => ({
        getCapabilities: async ctx => { checks.push(ctx); return capability(ctx) },
    }) }) } }
    const swapSnapshot = { data: { swap: { ...fixture.swap, id: 'capability-discovery-swap',
        status: 'completed', transactions: [], use_deposit_address: false } } }
    const preferences = { gaslessEnabled: gasless }
    const network = fixture.network
    const settings = { sourceRoutes: [], destinationRoutes: [], networks: [network] }
    const token = { ...fixture.token, contract: native ? null : fixture.token.contract,
        supports_gasless_deposit: true, gasless_standard: 'eip3009' }
    const values = { from: network, to: network, fromAsset: token, toAsset: { symbol: 'AAVE' },
        destination_address: fixture.account, amount: '1', depositMethod: depositAddress ? 'deposit_address' : 'wallet' }
    const capabilityHook = pure('../src/hooks/useAtomicBatchCapability.ts', {
        swr: { default: useSWR }, '@/lib/resolvers/resolverService': resolvers,
    })
    const context = createSwapContext({
        Client: class {
            CreateSwapAsync = async data => { requests.push(data); return { data: { swap: { id: 'created' }, quote: {} } } }
            GetDepositActionsAsync = async () => ({ data: [fixture.actions.zero_allowance] })
        },
        getSwapId: () => existing ? swapSnapshot.data.swap.id : undefined, getAccount: () => wallet,
        overrides: {
            ...(discover ? { '@/hooks/useAtomicBatchCapability': capabilityHook } : {}),
            '@/hooks/useWallet': { default: () => ({ wallets: [wallet] }) },
            './settings': { useInitialSettings: () => ({ swapId: existing ? swapSnapshot.data.swap.id : undefined }), useSettingsState: () => settings },
            '@/helpers/atomicBatch': pure('../src/helpers/atomicBatch.ts'),
            '@/helpers/gasless': pure('../src/helpers/gasless.ts'),
            '@/helpers/swapFlow': pure('../src/helpers/swapFlow.ts'),
            '@/stores/contractAddressStore': { useContractAddressStore: () => ({ checkContractStatus: async () => ({ sourceIsContract: false }) }) },
            '@/stores/gaslessPreferenceStore': { useGaslessPreferenceStore: store(preferences) },
            '@/lib/extendedRoutes/registry': { resolveExtendedRoutePlan: () => undefined },
            '@/lib/resolvers/resolverService': resolvers,
            '@/hooks/useFee': { transformSwapDataToQuoteArgs: () => undefined, useQuoteData: () => ({ quote: quoteReady ? {
                quote: { source_network: values.from, source_token: values.fromAsset,
                    destination_network: values.to, destination_token: values.toAsset,
                    path: [{ provider, order: 0 }] },
            } : undefined }) },
            '@/hooks/useSwapPolling': { useSwapPolling: id => ({ data: id ? swapSnapshot : undefined }) },
            '@/lib/swapLifecycle': { lifecycleContextFromForm: () => ({}) },
            '@/lib/swapCreation': { createSwapAttempt: async prepare => (await (await prepare()).request()).data },
            '@layerswap/utils': { KnownInternalNames: { Networks: {} } },
        },
    })
    const labels = []
    const Discovery = pure('../src/components/Pages/Swap/Form/AtomicBatchDiscovery.tsx', {
        react: React,
        formik: { useFormikContext: () => ({ values }) },
        '@/context/swap': context,
        '@/context/swapAccounts': { useSelectedAccount: () => wallet },
        '@/hooks/useWallet': { default: () => ({ wallets: [wallet] }) },
        '@/hooks/useAtomicBatchCapability': capabilityHook,
        '@/lib/address/Address': { Address: { equals: (a, b) => a === b } },
    }).default
    function Read() { update = context.useSwapDataUpdate(); state = context.useSwapDataState(); labels.push(state.flow.actionButtonText); return null }
    const root = createRoot(document.getElementById('root'))
    const swrConfig = { provider: () => new Map(), dedupingInterval: swrDedupingInterval }
    const render = () => act(() => root.render(createElement(SWRConfig, { value: swrConfig },
        createElement(context.SwapDataProvider, null,
            createElement(React.Fragment, null, liveSource ? createElement(Discovery) : null, createElement(Read))))))
    await render()
    if (submit) await act(() => update.setSubmitedFormValues(values))
    return { requests, checks, values, preferences, labels,
        review: async () => { quoteReady = true; await act(() => update.setSubmitedFormValues(values)) },
        changeSource: async changes => { Object.assign(values, changes); await render() },
        get update() { return update }, get state() { return state }, root,
        changeWallet: async changes => { wallet = { ...wallet, ...changes }; await render() } }
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

for (const [capability, kind, label] of [
    ['supported', 'atomic-batch', 'Approve and swap'],
    ['ready', 'frontend-swap', 'Sign to swap'],
    ['unsupported', 'frontend-swap', 'Sign to swap'],
]) test(`a draft discovers ${capability} support without creating a swap`, async () => {
    const h = await setup({ discover: true, capability: async () => capability })
    try {
        assert.equal(h.state.flow.kind, kind)
        assert.equal(h.state.flow.actionButtonText, label)
        assert.equal(h.state.flow.compactQuote, false)
        assert.equal(h.checks.length, 1)
        assert.equal(h.requests.length, 0)
        await h.changeWallet({})
        await act(() => h.update.setSubmitedFormValues({ ...h.values, amount: '2' }))
        assert.equal(h.checks.length, 1, 'rerenders and amount edits do not query wallet capabilities again')
        assert.equal(h.requests.length, 0, 'reviewing the draft never creates a swap')
        await act(async () => { await h.update.createSwap(h.values, {}) })
        assert.equal(h.requests.length, 1)
        assert.equal(h.requests[0].use_atomic_batch, capability === 'supported' ? true : undefined)
    } finally { await act(() => h.root.unmount()) }
})

for (const mode of ['native', 'gasless', 'depositAddress', 'bridge']) test(`${mode} drafts do not start batching discovery in the swap context`, async () => {
    const h = await setup({ discover: true, [mode]: true, provider: mode === 'bridge' ? 'ACROSS' : '0X' })
    try {
        assert.equal(h.checks.length, 0)
        assert.equal(h.requests.length, 0)
        assert.notEqual(h.state.flow.kind, 'atomic-batch')
        if (mode === 'bridge') assert.equal(h.state.flow.actionButtonText, 'Send from wallet')
    } finally { await act(() => h.root.unmount()) }
})

test('a stale capability response cannot relabel the newly selected account', async () => {
    const responses = []
    const h = await setup({ discover: true, capability: () => new Promise(resolve => responses.push(resolve)) })
    try {
        await h.changeWallet({ address: `0x${'4'.repeat(40)}`, addresses: [`0x${'4'.repeat(40)}`] })
        assert.equal(responses.length, 2)
        await act(async () => { responses[0]('supported'); await flush() })
        assert.equal(h.state.flow.actionButtonText, 'Sign to swap')
        await act(async () => { responses[1]('unsupported'); await flush() })
        assert.equal(h.state.flow.actionButtonText, 'Sign to swap')
        assert.equal(h.requests.length, 0)
    } finally { await act(() => h.root.unmount()) }
})

for (const capability of ['supported', 'unsupported']) test(`wallet discovery resolves ${capability} support before the quote and review`, async () => {
    let respond
    const h = await setup({ liveSource: true, submit: false, quoteReady: false, discover: true,
        capability: () => new Promise(resolve => { respond = resolve }) })
    try {
        assert.equal(h.state.swapBasicData, undefined, 'no submitted draft is needed')
        assert.equal(h.state.quote, undefined, 'wallet discovery does not wait for a quote')
        assert.equal(h.checks.length, 1)
        await act(async () => { respond(capability); await flush() })
        h.labels.length = 0
        await h.review()
        const label = capability === 'supported' ? 'Approve and swap' : 'Sign to swap'
        assert.equal(h.state.flow.actionButtonText, label)
        assert.ok(h.labels.length > 0)
        assert.ok(h.labels.every(value => value === label), 'the first review render uses the detected capability')
        assert.equal(h.checks.length, 1, 'opening review reuses the result')
        assert.equal(h.requests.length, 0)
    } finally { await act(() => h.root.unmount()) }
})

test('token and amount edits reuse wallet support discovered on the form', async () => {
    const h = await setup({ liveSource: true, submit: false, quoteReady: false, discover: true })
    try {
        assert.equal(h.checks.length, 1)
        await h.changeSource({ fromAsset: { ...h.values.fromAsset, symbol: 'OTHER', contract: `0x${'5'.repeat(40)}` }, amount: '2' })
        assert.equal(h.checks.length, 1)
        await h.review()
        assert.equal(h.state.flow.actionButtonText, 'Approve and swap')
        assert.equal(h.checks.length, 1)
    } finally { await act(() => h.root.unmount()) }
})

test('returning to a wallet refreshes its cached support without using another chain response', async () => {
    const responses = []
    const h = await setup({ discover: true, swrDedupingInterval: 0, capability: () => new Promise(resolve => responses.push(resolve)) })
    try {
        await act(async () => { responses[0]('supported'); await flush() })
        assert.equal(h.state.flow.actionButtonText, 'Approve and swap')
        await h.changeWallet({ chainId: 1 })
        await h.changeWallet({ chainId: 42161 })
        assert.equal(responses.length, 3)
        assert.equal(h.state.flow.actionButtonText, 'Approve and swap')
        await act(async () => { responses[1]('unsupported'); await flush() })
        assert.equal(h.state.flow.actionButtonText, 'Approve and swap')
        await act(async () => { responses[2]('unsupported'); await flush() })
        assert.equal(h.state.flow.actionButtonText, 'Sign to swap')
    } finally { await act(() => h.root.unmount()) }
})

test('changing the runtime connector identity rediscovers support', async () => {
    let checks = 0
    const h = await setup({ discover: true, capability: async () => ++checks === 1 ? 'supported' : 'unsupported' })
    try {
        assert.equal(h.state.flow.actionButtonText, 'Approve and swap')
        await h.changeWallet({ metadata: { connectorId: 'selected', connectorUid: 'new-connection' } })
        assert.equal(checks, 2)
        assert.equal(h.state.flow.actionButtonText, 'Sign to swap')
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

test('existing and completed swaps never rediscover capabilities after wallet changes', async () => {
    const h = await setup({ existing: true, discover: true, liveSource: true })
    try {
        assert.equal(h.state.swapId, 'capability-discovery-swap')
        assert.equal(h.checks.length, 0)
        await h.changeWallet({ chainId: 1 })
        await h.changeWallet({ address: `0x${'4'.repeat(40)}`, addresses: [`0x${'4'.repeat(40)}`] })
        assert.equal(h.checks.length, 0, 'backend observation must not cause new wallet requests')
        await act(() => h.update.setSwapId(undefined))
        assert.equal(h.checks.length, 1, 'returning to a draft can discover support without creating a swap')
        assert.equal(h.requests.length, 0)
    } finally { await act(() => h.root.unmount()) }
})
