import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement, StrictMode } from 'react'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://widget.example' })
const globals = { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true }
const previousGlobals = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries(globals)) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}

// Keep the real gas hook, balance subscriptions and SWR cache; replace the RPC boundary.
const mockUrl = `data:text/javascript,${encodeURIComponent(`
  export const requests = []
  export const resolverService = { getGasResolver: () => ({ getGas(args) {
    const request = Promise.withResolvers()
    requests.push({ ...request, args })
    return request.promise
  } }) }
`)}`
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  const parent = context.parentURL ?? ''
  if (parent.includes('/dist/esm/') && specifier.endsWith('/resolvers/resolverService')) {
    return { url: mockUrl, shortCircuit: true }
  }
  if (specifier.startsWith('.') && !extname(specifier) && parent.includes('/dist/esm/')) return nextResolve(`${specifier}.js`, context)
  return nextResolve(specifier, context)
} })

const { requests } = await import(mockUrl)
const { createRoot } = await import('react-dom/client')
const { SWRConfig } = await import('swr')
const { default: useSWRGas } = await import('../dist/esm/lib/gases/useSWRGas.js')
const { getKey, useBalanceStore } = await import('../dist/esm/stores/balanceStore.js')
const token = { symbol: 'ETH', decimals: 18 }
const network = { name: 'ETHEREUM_MAINNET', token }
let root, container, props, swrConfig, gasResult

function Probe() {
  gasResult = useSWRGas(props.address, props.network, props.token, props.amount, props.wallet)
  return null
}
const render = () => act(() => root.render(createElement(StrictMode, null,
  createElement(SWRConfig, { value: swrConfig }, createElement(Probe)),
)))
const setBalance = (amount, { address = props.address, network = props.network, token = props.token } = {}) => act(() => {
  useBalanceStore.setState(state => ({
    balances: {
      ...state.balances,
      [getKey(address, network.name)]: {
        status: 'success',
        data: { balances: [
          { network: network.name, token: 'OTHER_TOKEN', amount: 99 },
          { network: network.name, token: token.symbol, amount },
        ] },
      },
    },
  }))
})
const settle = (request, gas) => act(async () => {
  request.resolve({ gas, token: request.args.network.token })
  await request.promise
})

beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  requests.length = 0
  useBalanceStore.setState({ balances: {} })
  props = { address: 'source', network, token, amount: '', wallet: { id: 'wallet', address: 'source' } }
  swrConfig = { provider: () => new Map(), dedupingInterval: 0, revalidateOnFocus: false, revalidateOnReconnect: false, shouldRetryOnError: false }
})
afterEach(async () => {
  await act(() => root.unmount())
  container.remove()
})
after(() => {
  hooks.deregister()
  dom.window.close()
  for (const key of Object.keys(globals)) {
    if (previousGlobals[key]) Object.defineProperty(globalThis, key, previousGlobals[key])
    else delete globalThis[key]
  }
})

for (const amount of ['', undefined, null]) {
  test(`an empty amount (${String(amount)}) estimates with the selected token balance`, async () => {
    props.amount = amount
    await setBalance(0.75)
    await render()
    assert.equal(requests.length, 1)
    assert.equal(requests[0].args.amount, 0.75)
    assert.equal(requests[0].args.wallet, props.wallet)
    assert.equal(props.amount, amount)
  })
}

test('an empty amount waits for the balance and re-estimates when it changes', async () => {
  await render()
  assert.equal(requests.length, 0)
  await setBalance(0.75)
  assert.equal(requests.length, 1)
  assert.equal(requests[0].args.amount, 0.75)
  await settle(requests[0], 0.01)
  assert.equal(gasResult.gasData.gas, 0.01)

  await setBalance(0.5)
  assert.equal(requests.length, 2)
  assert.equal(requests[1].args.amount, 0.5)
  assert.equal(gasResult.gasData, undefined)
})

test('the entered amount takes precedence and clearing it restores the balance fallback', async () => {
  props.amount = '0.25'
  await render()
  assert.equal(requests.length, 1)
  assert.equal(requests[0].args.amount, 0.25)
  await settle(requests[0], 0.01)
  await setBalance(0.75)
  assert.equal(requests.length, 1)

  props.amount = ''
  await render()
  assert.equal(requests.length, 2)
  assert.equal(requests[1].args.amount, 0.75)
  assert.equal(gasResult.gasData, undefined)
})

test('the balance fallback stays scoped to the selected account, network and token', async () => {
  await setBalance(1)
  props.token = { symbol: 'USDC', decimals: 6 }
  await render()
  assert.equal(requests.length, 0)
  await setBalance(50)
  assert.equal(requests[0].args.amount, 50)
  assert.equal(requests[0].args.token.symbol, 'USDC')
  await settle(requests[0], 0.01)

  props.address = 'other-source'
  await render()
  assert.equal(requests.length, 1)
  assert.equal(gasResult.gasData, undefined)
  await setBalance(25)
  assert.equal(requests[1].args.amount, 25)
  assert.equal(requests[1].args.address, 'other-source')

  props.network = { ...network, name: 'BASE_MAINNET' }
  await render()
  assert.equal(requests.length, 2)
  await setBalance(10)
  assert.equal(requests[2].args.amount, 10)
  assert.equal(requests[2].args.network.name, 'BASE_MAINNET')
})

test('gas estimation does not send a missing, zero or invalid amount', async () => {
  await render()
  for (const balance of [undefined, 0, -1, NaN, Infinity]) {
    await setBalance(balance)
    assert.equal(requests.length, 0)
  }
  await setBalance(1)
  assert.equal(requests.length, 1)
  await settle(requests[0], 0.01)

  for (const amount of [0, '0', -1, NaN, Infinity, 'invalid']) {
    props.amount = amount
    await render()
    assert.equal(requests.length, 1)
    assert.equal(gasResult.gasData, undefined)
  }
})
