import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement, Fragment, StrictMode } from 'react'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const previous = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    if (specifier.endsWith('/lib/apiClients/layerSwapApiClient')) return {
        url: 'data:text/javascript,' + encodeURIComponent(`
            export default class Client {
                fetcher = key => globalThis.__depositTransport(key)
                GetSwapAsync() { throw new Error('Deposit polling must not request the whole swap') }
            }
        `), shortCircuit: true,
    }
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
        return nextResolve(specifier + '.js', context)
    }
    return nextResolve(specifier, context)
} })
const { createRoot } = await import('react-dom/client')
const { default: useSWR, SWRConfig } = await import('swr')
const { useDepositActionPolling, depositActionsKey } = await import('../dist/esm/hooks/useDepositActionPolling.js')

const sign = { type: 'sign', step: 'sign', status: 'action_required', typed_data: { message: { nonce: 'initial' } } }
const publish = { type: 'transfer', step: 'publish', status: 'waiting' }
const waiting = () => ({ data: [{ ...sign, status: 'completed' }, publish] })
const ready = () => ({ data: [{ ...sign, status: 'completed' }, { ...publish, status: 'action_required' }] })
let root, container, result, config, requests, response, failure
const fetcher = key => globalThis.__depositTransport(key)

// The context already subscribes to this SWR key. It must share the requests
// with the withdrawal hook, even when StrictMode replays the mount.
function ContextSubscriber({ id, address }) {
    useSWR(id && address ? depositActionsKey(id, address) : null, fetcher)
    return null
}
function Withdrawal({ id, address, executing }) {
    result = useDepositActionPolling(id, address, executing)
    return createElement('output', null, result.data?.find(action => action.status === 'action_required')?.step ?? 'waiting')
}
const render = (props = {}) => act(async () => root.render(createElement(StrictMode, null,
    createElement(SWRConfig, { value: config },
        createElement(Fragment, null,
            createElement(ContextSubscriber, { id: 's1', address: 'source', ...props }),
            createElement(Withdrawal, { id: 's1', address: 'source', executing: true, ...props }))))))
const wait = (signal, extra = {}) => result.waitForTransition({ swapId: 's1', sourceAddress: 'source', previousAction: sign, signal, ...extra })

beforeEach(() => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    requests = []
    response = { data: [sign, publish] }
    failure = undefined
    config = { provider: () => new Map(), revalidateOnFocus: false, revalidateOnReconnect: false, shouldRetryOnError: false, isVisible: () => true }
    globalThis.__depositTransport = async key => {
        requests.push(key)
        if (failure) throw failure
        return response
    }
})
afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    delete globalThis.__depositTransport
})
after(() => {
    hooks.deregister()
    dom.window.close()
    for (const key of ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT']) {
        if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
        else delete globalThis[key]
    }
})

test('one SWR request stream drives both the UI and a sign-to-publish wait longer than 20 seconds', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
    await render()
    assert.equal(requests.length, 1, 'context and withdrawal share the initial request')
    const scope = new AbortController()
    let settled = false
    const pending = wait(scope.signal).then(actions => { settled = true; return actions })
    const secondObserver = wait(scope.signal)
    assert.equal(requests.length, 1, 'waiting never starts another request')
    response = waiting()
    for (let i = 0; i < 14; i++) await act(async () => { t.mock.timers.tick(2000) })
    assert.equal(settled, false)
    assert.equal(container.textContent, 'waiting')
    response = ready()
    await act(async () => { t.mock.timers.tick(2000) })
    assert.deepEqual(await pending, response.data)
    assert.deepEqual(await secondObserver, result.data)
    assert.equal(container.textContent, 'publish')
    // The context's default 2s dedupe window coalesces the first scheduled poll
    // with the mount request; subsequent polls come only from the withdrawal hook.
    assert.equal(requests.length, 15, 'waiting adds no requests to the single SWR polling stream')
    assert.ok(requests.every(key => key === depositActionsKey('s1', 'source')))
})

test('idle polling continues after execution ends and uses the slower interval', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
    await render()
    await render({ executing: false })
    const before = requests.length
    response = ready()
    await act(async () => { t.mock.timers.tick(4999) })
    assert.equal(requests.length, before)
    await act(async () => { t.mock.timers.tick(1) })
    assert.equal(requests.length, before + 1)
    assert.equal(container.textContent, 'publish')
})

test('retry revalidates through SWR and never returns stale data after a failed or empty refresh', async () => {
    await render()
    response = { data: [{ ...sign, typed_data: { message: { nonce: 'fresh' } } }, publish] }
    let actions
    await act(async () => { actions = await result.refresh('s1', 'source') })
    assert.equal(actions[0].typed_data.message.nonce, 'fresh')
    assert.equal(requests.length, 2)
    failure = new Error('Refresh unavailable')
    await act(async () => { await assert.rejects(result.refresh('s1', 'source'), /Refresh unavailable/) })
    assert.equal(result.data[0].typed_data.message.nonce, 'fresh', 'cached UI data remains visible')
    failure = undefined
    response = { data: [] }
    await act(async () => { await assert.rejects(result.refresh('s1', 'source'), /No deposit actions/) })
})

test('a newly created swap can start waiting before its SWR subscription mounts', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
    await render({ id: undefined })
    const pending = wait(new AbortController().signal)
    assert.equal(requests.length, 0)
    response = ready()
    await render()
    assert.deepEqual(await pending, response.data)
    assert.equal(requests.length, 1)
})

test('waiting after a retry reads the refreshed cache before React commits its next render', async () => {
    response = ready()
    await render()
    const scope = new AbortController()
    let settled = false
    let pending
    await act(async () => {
        response = { data: [sign, publish] }
        await result.refresh('s1', 'source')
        pending = wait(scope.signal).then(actions => { settled = true; return actions })
        await Promise.resolve()
        assert.equal(settled, false, 'the old publication payload cannot resume the refreshed signing workflow')
    })
    response = ready()
    await act(async () => { await result.refresh('s1', 'source') })
    assert.deepEqual(await pending, response.data)
})

test('updates for another account cannot continue the old execution, and cancellation releases its wait', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
    await render()
    const scope = new AbortController()
    let settled = false
    const pending = wait(scope.signal).finally(() => { settled = true })
    const cancelled = assert.rejects(pending, { name: 'AbortError' })
    response = ready()
    await render({ address: 'other-account' })
    assert.equal(container.textContent, 'publish')
    assert.equal(settled, false)
    scope.abort()
    await cancelled
})

test('a transition that stays pending times out independently of the polling loop', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
    await render()
    let settled = false
    const pending = wait(new AbortController().signal).finally(() => { settled = true })
    const timedOut = assert.rejects(pending, /The transaction is still confirming/)
    response = waiting()
    await act(async () => { t.mock.timers.tick(139999) })
    assert.equal(settled, false)
    await act(async () => { t.mock.timers.tick(1) })
    await timedOut
    const before = requests.length
    await act(async () => { t.mock.timers.tick(2000) })
    assert.equal(requests.length, before + 1, 'timeout does not stop observing the swap')
})

for (const kind of ['action', 'api', 'network']) {
    test(`${kind} failures reject the transition without waiting for the deadline`, async t => {
        t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
        await render()
        const pending = assert.rejects(wait(new AbortController().signal), /Transition failed/)
        if (kind === 'action') response = { data: [{ ...sign, status: 'failed', detail: 'Transition failed' }] }
        if (kind === 'api') response = { error: new Error('Transition failed') }
        if (kind === 'network') failure = new Error('Transition failed')
        for (let i = 0; i < 2; i++) await act(async () => { t.mock.timers.tick(2000) })
        await pending
    })
}

test('a completed workflow resolves without another request', async () => {
    response = { data: [{ ...sign, status: 'completed' }, { ...publish, status: 'completed' }] }
    await render()
    assert.deepEqual(await wait(new AbortController().signal), response.data)
    assert.equal(requests.length, 1)
})
