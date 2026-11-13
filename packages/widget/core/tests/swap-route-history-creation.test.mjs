import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import React, { act, createElement } from 'react'
import { JSDOM } from 'jsdom'
import { createSwapContext } from './helpers/swap-context.mjs'
import { loadSource } from './helpers/source.mjs'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://widget.example' })
const previous = Object.getOwnPropertyDescriptors(globalThis)
const globals = { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true }
for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
const { createRoot } = await import('react-dom/client')

const state = {}
const swapCreation = loadSource('lib/swapCreation.ts', {
    '@layerswap/widget-types': { getErrorOccurrenceId: () => 'test-error' },
    '@/lib/ErrorHandler': { ErrorHandler: error => state.errors.push(error) },
    './swapLifecycle': { lifecycleErrorDetails: () => ({}) },
})
const context = createSwapContext({
    Client: class {
        CreateSwapAsync() { return state.request() }
    },
    getSwapId: () => undefined,
    getAccount: () => undefined,
    swr: { default: () => ({}) },
    overrides: {
        '@/helpers/swapFlow': loadSource('helpers/swapFlow.ts'),
        '@/helpers/gasless': { isGaslessCapableRoute: () => false },
        '@/lib/extendedRoutes/registry': { resolveExtendedRoutePlan: () => undefined },
        '@/lib/swapLifecycle': { lifecycleContextFromForm: () => ({}) },
        '@/lib/swapCreation': swapCreation,
        '@/stores/recentRoutesStore': { useRecentNetworksStore: selector => selector({ updateRecentNetworks: () => state.updateRecent() }) },
        '@/stores/swapRouteHistoryStore': { recordSwapRouteHistory: (swap, overrides) => {
            state.history.push({ swap, overrides })
            // Persistence must never hold up returning the created swap.
            return new Promise(() => {})
        } },
    },
})
const created = {
    swap: { id: 'created', source_network: { name: 'BACKEND_SOURCE' }, source_token: { symbol: 'BACKEND_TOKEN' } },
    quote: { receive_amount: 1 },
}
const values = {
    from: { name: 'DISPLAYED_SOURCE' }, fromAsset: { symbol: 'SRC' },
    to: { name: 'DESTINATION' }, toAsset: { symbol: 'DST' },
    amount: '1', destination_address: 'destination', depositMethod: 'wallet',
}
let root, container, updates
function Probe() {
    updates = context.useSwapDataUpdate()
    return null
}
beforeEach(async () => {
    Object.assign(state, { history: [], errors: [], request: async () => ({ data: created }), updateRecent: () => {} })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(() => root.render(createElement(context.SwapDataProvider, null, createElement(Probe))))
})
afterEach(async () => {
    await act(() => root.unmount())
    container.remove()
})
after(() => {
    dom.window.close()
    for (const key of Object.keys(globals)) {
        if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
        else delete globalThis[key]
    }
})

test('history is recorded only after creation, using displayed routes rather than backend route identities', async () => {
    const response = Promise.withResolvers()
    state.request = () => response.promise
    const pending = updates.createSwap(values, {})
    await Promise.resolve()
    assert.deepEqual(state.history, [])
    response.resolve({ data: created })
    assert.equal(await pending, created)
    assert.deepEqual(state.errors, [])
    assert.deepEqual(state.history, [{ swap: created, overrides: {
        sourceRoute: { network: 'DISPLAYED_SOURCE', token: 'SRC' },
        destinationRoute: { network: 'DESTINATION', token: 'DST' },
    } }])
})

test('exchange creation records the destination and explicitly excludes the source', async () => {
    await updates.createSwap({ ...values, depositMethod: 'deposit_address', fromExchange: { name: 'EXCHANGE' } }, {})
    assert.equal(state.history.length, 1)
    assert.deepEqual(state.history[0].overrides, {
        sourceRoute: null,
        destinationRoute: { network: 'DESTINATION', token: 'DST' },
    })
})

for (const failure of ['rejection', 'error envelope', 'missing id']) {
    test(`creation ${failure} never records history`, async () => {
        state.request = async () => {
            if (failure === 'rejection') throw new Error('Request failed')
            if (failure === 'error envelope') return { error: { message: 'Request failed' } }
            return { data: { swap: {} } }
        }
        await assert.rejects(updates.createSwap(values, {}))
        assert.deepEqual(state.history, [])
    })
}

test('a failed recent-route update does not skip persistent history or reject a created swap', async () => {
    state.updateRecent = () => { throw new Error('Storage unavailable') }
    assert.equal(await updates.createSwap(values, {}), created)
    assert.equal(state.history.length, 1)
    assert.equal(state.errors.length, 1)
    assert.equal(state.errors[0].operation, 'recentRoutes.updateRecentNetworks')
})
