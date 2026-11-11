import assert from 'node:assert/strict'
import test, { beforeEach, afterEach, after } from 'node:test'
import { createRequire } from 'node:module'
import React, { act, createElement, StrictMode } from 'react'
import { JSDOM } from 'jsdom'
import { loadSource } from './helpers/source.mjs'

const require = createRequire(import.meta.url)
const dom = new JSDOM('<!doctype html><html><body></body></html>')
const previous = Object.getOwnPropertyDescriptors(globalThis)
const online = { onLine: true, userAgent: dom.window.navigator.userAgent }
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: online, IS_REACT_ACT_ENVIRONMENT: true })) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
const { createRoot } = await import('react-dom/client')
const originalNow = Date.now
let now, timers, nextTimer, requests, root, container, store, useBalance, result
const network = { name: 'ARBITRUM_MAINNET', tokens: [] }
const options = { refreshInterval: 20000, dedupeInterval: 20000 }

function Probe({ address = 'source', opts = options }) {
  result = useBalance(address, network, opts)
  return null
}
const render = (children = createElement(Probe)) => act(() => root.render(createElement(StrictMode, null, children)))
async function advance(milliseconds) {
  const target = now + milliseconds
  while (true) {
    const due = [...timers.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0]
    if (!due) break
    if (due[1].interval) {
      timers.set(due[0], { ...due[1], at: due[1].at + due[1].interval })
    } else {
      timers.delete(due[0])
    }
    now = due[1].at
    await act(async () => { due[1].callback() })
  }
  now = target
}
async function settle({ fail = false, latency = 1000 } = {}) {
  const request = requests.at(-1)
  now += latency
  await act(async () => {
    if (fail) request.reject(new Error('RPC unavailable'))
    else request.resolve({ balances: [{ network: network.name, token: 'ETH', amount: 1 }] })
    await request.promise.catch(() => undefined)
  })
}
beforeEach(() => {
  now = 100000; timers = new Map(); nextTimer = 0; requests = []
  Date.now = () => now
  online.onLine = true
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  window.setTimeout = (callback, delay) => {
    const id = ++nextTimer
    timers.set(id, { callback, at: now + delay })
    return id
  }
  window.clearTimeout = id => timers.delete(id)
  window.setInterval = (callback, interval) => {
    const id = ++nextTimer
    timers.set(id, { callback, interval, at: now + interval })
    return id
  }
  window.clearInterval = id => timers.delete(id)
  // Keep the real store's cache timestamps and in-flight deduplication.
  store = loadSource('stores/balanceStore.ts', {
    zustand: require('zustand'), 'zustand/middleware': require('zustand/middleware'),
    '../lib/resolvers/resolverService': { resolverService: { getBalanceResolver: () => ({ getBalance: () => {
      const request = { ...Promise.withResolvers(), startedAt: now }
      requests.push(request)
      return request.promise
    } }) } },
  })
  ;({ useBalance } = loadSource('lib/balances/useBalance.ts', { react: React, '@/stores/balanceStore': store }))
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
})
afterEach(async () => {
  await act(() => root.unmount())
  container.remove()
  Date.now = originalNow
})
after(() => {
  dom.window.close()
  for (const key of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) {
    if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
    else delete globalThis[key]
  }
})

test('polls twenty seconds after each completed RPC instead of skipping alternate ticks', async () => {
  await render()
  await settle()
  await advance(19999)
  assert.equal(requests.length, 1)
  await advance(1)
  assert.equal(requests.length, 2)
  await settle()
  await advance(20000)
  assert.deepEqual(requests.map(request => request.startedAt), [100000, 121000, 142000])
  await settle()
})

test('multiple subscribers and StrictMode share each in-flight request', async () => {
  await render(createElement(React.Fragment, null, createElement(Probe), createElement(Probe)))
  assert.equal(requests.length, 1)
  await settle()
  await advance(20000)
  assert.equal(requests.length, 2)
  await advance(40000)
  assert.equal(requests.length, 2, 'a slow request must not overlap another poll')
  await settle()
})

test('honors the supplied cache deduplication interval on mount', async () => {
  store.useBalanceStore.setState({
    balances: { 'source:ARBITRUM_MAINNET': { data: { balances: [] }, status: 'success' } },
    lastFetchMap: { 'source:ARBITRUM_MAINNET': now - 10000 },
  })
  await render(createElement(Probe, { opts: { ...options, dedupeInterval: 5000 } }))
  assert.equal(requests.length, 1)
  await settle()
})

test('retries failed polling after the interval without an immediate retry loop', async () => {
  await render()
  await settle({ fail: true })
  assert.match(result.error.message, /RPC unavailable/)
  assert.equal(requests.length, 1)
  await advance(20000)
  assert.equal(requests.length, 2)
  await settle()
  assert.equal(result.error, undefined)
})

test('pauses while hidden or offline and stops scheduling after unmount', async () => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: true })
  await render()
  await advance(20000)
  assert.equal(requests.length, 0)
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  online.onLine = false
  await advance(20000)
  assert.equal(requests.length, 0)
  online.onLine = true
  await advance(20000)
  assert.equal(requests.length, 1)
  await act(() => root.render(null))
  await settle()
  await advance(60000)
  assert.equal(requests.length, 1)
  assert.equal(timers.size, 0)
})

test('manual refresh bypasses fresh cache while periodic refresh is disabled', async () => {
  await render(createElement(Probe, { opts: { refreshInterval: 0, dedupeInterval: 20000 } }))
  await settle()
  await advance(1000)
  let refresh
  await act(() => { refresh = result.mutate() })
  assert.equal(requests.length, 2)
  await settle()
  await refresh
  assert.equal(timers.size, 0)
})
