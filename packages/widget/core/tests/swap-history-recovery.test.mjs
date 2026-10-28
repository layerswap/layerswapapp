import assert from 'node:assert/strict'
import test, { after, beforeEach } from 'node:test'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import ts from 'typescript'
import * as React from 'react'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<div id="root"></div>', { url: 'https://widget.test' })
const previous = Object.getOwnPropertyDescriptors(globalThis)
const surfaces = { window: dom.window, document: dom.window.document,
    localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true }
for (const [key, value] of Object.entries(surfaces)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    if (specifier.endsWith('/lib/apiClients/layerSwapApiClient')) {
        return { url: 'data:text/javascript,export const TransactionType = { Input: "input" }', shortCircuit: true }
    }
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
        return nextResolve(`${specifier}.js`, context)
    }
    return nextResolve(specifier, context)
} })
const stores = await import('../dist/esm/stores/swapTransactionStore.js')
const { useSwapTransactionStore: store } = stores
const { shouldDisplay } = await import('../dist/esm/components/Pages/SwapHistory/Filters/filterSwaps.js')

const requests = []
const responses = new Map()
const sourceAddress = `0x${'1'.repeat(40)}`
const otherAddress = `0x${'2'.repeat(40)}`
const emptyBackend = { swaps: [], isLoading: false, isValidating: false }
let pendingBackend = emptyBackend
const identity = swap => swap
const imports = {
    react: React,
    '@layerswap/widget-types': { SwapStatus: { PendingRefund: 'pending_refund', LsTransferPending: 'ls_transfer_pending' } },
    './useSwrSwaps': { useSwrSwaps: options => options.statuses[0] === 'PendingDeposit' ? pendingBackend : emptyBackend },
    '@/lib/apiClients/layerSwapApiClient': { default: class {
        async GetSwapAsync(id) {
            requests.push(id)
            assert.ok(responses.has(id), `Unexpected history recovery for ${id}`)
            return { data: responses.get(id) }
        }
    } },
    '@/stores/swapTransactionStore': stores,
    './useExtendedSourceSkin': { useExtendedSourceSkin: () => identity },
    '@/lib/address/Address': { Address: class {
        constructor(address) { this.normalized = address.toLowerCase() }
    } },
}
const source = readFileSync(new URL('../src/hooks/useSwapHistoryData.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})
const module = { exports: {} }
new Function('require', 'module', 'exports', outputText)(name => {
    assert.ok(name in imports, `Unexpected history dependency: ${name}`)
    return imports[name]
}, module, module.exports)
const { useSwapHistoryData } = module.exports

beforeEach(() => {
    store.setState(store.getInitialState(), true)
    requests.length = 0
    responses.clear()
    pendingBackend = emptyBackend
})
after(() => {
    hooks.deregister()
    dom.window.close()
    for (const key of Object.keys(surfaces)) {
        if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
        else delete globalThis[key]
    }
})

function swapResponse(id, source = sourceAddress) {
    return { swap: { id, status: 'user_transfer_pending', transactions: [],
        created_date: '2026-10-22T00:00:00Z', source_address: source,
        source_network: { name: 'SOURCE' }, destination_address: source,
        destination_network: { name: 'DESTINATION' } } }
}

for (const listedByBackend of [false, true]) {
    test(`hydrated uncertain submissions remain recoverable ${listedByBackend ? 'in backend results' : 'when missing from backend results'}`, async () => {
        const response = swapResponse('uncertain')
        responses.set('uncertain', response)
        const original = store.getState()
        original.setSwapTransactionKind('uncertain', 'atomic-batch')
        original.markSubmissionPending('uncertain')
        original.setSwapTransactionKind('untouched', 'atomic-batch')
        const saved = localStorage.getItem('swapTransactions')
        store.setState(store.getInitialState(), true)
        localStorage.setItem('swapTransactions', saved)
        await store.persist.rehydrate()
        if (listedByBackend) pendingBackend = { ...emptyBackend, swaps: [response] }

        let result
        function Probe() {
            result = useSwapHistoryData([sourceAddress], ['SOURCE'])
            return null
        }
        const root = createRoot(document.getElementById('root'))
        try {
            await act(async () => root.render(createElement(Probe)))
            assert.deepEqual(requests, listedByBackend ? [] : ['uncertain'])
            const recovered = [...result.pendingDeposit.swaps, ...result.completed.swaps]
            assert.deepEqual(recovered.map(response => response.swap.id), ['uncertain'])
            const state = store.getState()
            assert.equal(state.swapTransactions.uncertain.timestamp, undefined)
            assert.equal(shouldDisplay(recovered[0], state.swapTransactions, state.pendingSubmissions), true)
            assert.equal(shouldDisplay(swapResponse('untouched'), state.swapTransactions, state.pendingSubmissions), false)
            assert.equal(state.pendingSubmissions.uncertain, true, 'history observation cannot release submission guards')
        } finally {
            await act(() => root.unmount())
        }
    })
}

test('pending recovery outlives the receipt window and respects selected wallet filters', async () => {
    store.setState({ swapTransactions: {
        uncertain: { kind: 'atomic-batch', timestamp: Date.now() - 31 * 60_000 },
        old: { kind: 'wallet-transfer', hash: 'old-hash', timestamp: Date.now() - 31 * 60_000 },
    }, pendingSubmissions: { uncertain: true, 'other-wallet': true } })
    responses.set('uncertain', swapResponse('uncertain'))
    responses.set('other-wallet', swapResponse('other-wallet', otherAddress))
    let result
    function Probe() {
        result = useSwapHistoryData([sourceAddress], ['SOURCE'])
        return null
    }
    const root = createRoot(document.getElementById('root'))
    try {
        await act(async () => root.render(createElement(Probe)))
        assert.deepEqual(requests.sort(), ['other-wallet', 'uncertain'])
        assert.deepEqual(result.completed.swaps.map(response => response.swap.id), ['uncertain'])
    } finally {
        await act(() => root.unmount())
    }
})
