import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement, StrictMode } from 'react'
import { Formik, useFormikContext } from 'formik'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://widget.example' })
const globals = { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true }
const previousGlobals = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries(globals)) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}

// Exercise the real Formik amount updates, SWR keys and Max calculation. Only
// wallet/RPC boundaries and tooltip presentation are replaced.
const mockUrl = `data:text/javascript,${encodeURIComponent(`
  export const state = {}
  export const useSelectedAccount = () => state.account
  export default () => ({ wallets: state.wallets })
  export const useBalance = () => ({ balances: state.balances, mutate: () => {} })
  export const Tooltip = ({ children }) => children
  export const TooltipTrigger = ({ children }) => children
  export const TooltipContent = () => null
  export const resolverService = { getGasResolver: () => ({ getGas(args) {
    const request = Promise.withResolvers()
    state.requests.push({ ...request, args })
    return request.promise
  } }) }
`)}`
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  const parent = context.parentURL ?? ''
  if (parent.endsWith('/components/Input/Amount/MinMax.js') && [
    '/context/swapAccounts', '/hooks/useWallet', '/lib/balances/useBalance', '/components/shadcn/tooltip',
  ].some(path => specifier.endsWith(path))) return { url: mockUrl, shortCircuit: true }
  if (parent.includes('/dist/esm/') && specifier.endsWith('/resolvers/resolverService')) {
    return { url: mockUrl, shortCircuit: true }
  }
  if (specifier.startsWith('.') && !extname(specifier) && parent.includes('/dist/esm/')) return nextResolve(`${specifier}.js`, context)
  return nextResolve(specifier, context)
} })

const { state } = await import(mockUrl)
const { createRoot } = await import('react-dom/client')
const { SWRConfig, useSWRConfig } = await import('swr')
const { default: MinMax } = await import('../dist/esm/components/Input/Amount/MinMax.js')
const { resolveMaxAllowedAmount } = await import('../dist/esm/components/Input/Amount/helpers.js')
const token = { symbol: 'ETH', decimals: 18, price_in_usd: 2000 }
const network = { name: 'ETHEREUM_MAINNET', token }
let root, container, props, swrConfig, formik, mutateGas
function Probe() {
  formik = useFormikContext()
  mutateGas = useSWRConfig().mutate
  return createElement(MinMax, props)
}
const render = () => act(() => root.render(createElement(StrictMode, null,
  createElement(SWRConfig, { value: swrConfig },
    createElement(Formik, { initialValues: { amount: '0.5' }, onSubmit() {} }, createElement(Probe))),
)))
const maxButton = () => container.querySelector('[data-attr="max-amount"]')
const settle = (request, gas) => act(async () => {
  request.resolve(gas === undefined ? undefined : { gas, token: request.args.network.token })
  await request.promise
})

beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  Object.assign(state, {
    account: { id: 'wallet', address: 'source' },
    wallets: [{ id: 'wallet', address: 'source' }],
    balances: [{ network: network.name, token: token.symbol, amount: 1 }],
    requests: [],
  })
  props = { from: network, fromCurrency: token, limitsMinAmount: 0.001, limitsMaxAmount: 10, depositMethod: 'wallet', onActionHover() {} }
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

test('repeated Max clicks cannot remove the reserve while the new amount is being estimated', async () => {
  await render()
  assert.equal(maxButton().disabled, true)
  await settle(state.requests[0], 0.01)
  assert.equal(maxButton().disabled, false)

  await act(() => maxButton().click())
  assert.equal(formik.values.amount, '0.9898')
  assert.equal(state.requests.length, 2)
  assert.equal(state.requests[1].args.amount, 0.9898)
  assert.equal(maxButton().disabled, true)

  await act(() => maxButton().click())
  assert.equal(formik.values.amount, '0.9898')
  await settle(state.requests[1], 0.02)
  assert.equal(maxButton().disabled, false)
  await act(() => maxButton().click())
  assert.equal(formik.values.amount, '0.9796')
})

test('an estimate from the previous account cannot enable Max for the current account', async () => {
  await render()
  const oldRequest = state.requests[0]
  state.account = { ...state.account, address: 'other-source' }
  await render()
  assert.equal(state.requests.length, 2)
  await settle(oldRequest, 0.01)
  assert.equal(maxButton().disabled, true)
  await settle(state.requests[1], 0.03)
  await act(() => maxButton().click())
  assert.equal(formik.values.amount, '0.9694')
})

test('an unavailable estimate leaves the existing amount untouched', async () => {
  await render()
  await settle(state.requests[0], undefined)
  assert.equal(maxButton().disabled, true)
  await act(() => maxButton().click())
  assert.equal(formik.values.amount, '0.5')
})

test('a failed estimate refresh cannot use the cached fee to enable Max', async () => {
  await render()
  await settle(state.requests[0], 0.01)
  let refresh
  await act(async () => { refresh = mutateGas('/gases/source/ETHEREUM_MAINNET/ETH/0.5') })
  assert.equal(state.requests.length, 2)
  await act(async () => {
    state.requests[1].reject(new Error('RPC unavailable'))
    await refresh
  })
  assert.equal(maxButton().disabled, true)
  await act(() => maxButton().click())
  assert.equal(formik.values.amount, '0.5')
})

test('tokens paid with another gas asset can still use Max before gas loads', async () => {
  props.fromCurrency = { symbol: 'USDC', decimals: 6, price_in_usd: 1 }
  state.balances = [{ network: network.name, token: 'USDC', amount: 50 }]
  await render()
  assert.equal(maxButton().disabled, false)
  await act(() => maxButton().click())
  assert.equal(formik.values.amount, '50')
})

test('deposit-address Max still uses route limits without a gas estimate', async () => {
  props.depositMethod = 'deposit_address'
  await render()
  assert.equal(maxButton().disabled, false)
  await act(() => maxButton().click())
  assert.equal(formik.values.amount, '10')
})

test('Max uses the route maximum when no wallet is connected', async () => {
  state.account = undefined
  state.wallets = []
  await render()
  assert.equal(state.requests.length, 0)
  assert.equal(maxButton().disabled, false)
  await act(() => maxButton().click())
  assert.equal(formik.values.amount, '10')
})

test('without a wallet Max stays enabled before route limits are available and uses them when loaded', async () => {
  state.account = undefined
  state.wallets = []
  props.limitsMaxAmount = undefined
  await render()
  assert.equal(maxButton().disabled, false)
  await act(() => maxButton().click())
  assert.equal(formik.values.amount, '0.5')

  props.limitsMaxAmount = 10
  await render()
  assert.equal(maxButton().disabled, false)
  await act(() => maxButton().click())
  assert.equal(formik.values.amount, '10')
  assert.equal(state.requests.length, 0)
})

test('disconnecting the source wallet makes Max use route limits despite a cached balance', async () => {
  await render()
  assert.equal(maxButton().disabled, true)

  // The selected account and its balance may still be cached during disconnect.
  state.wallets = []
  await render()
  assert.equal(maxButton().disabled, false)
  await act(() => maxButton().click())
  assert.equal(formik.values.amount, '10')
})

test('Max distinguishes a known zero fee from missing or invalid gas data', () => {
  const input = { walletBalance: { amount: 1 }, fromCurrency: token, native_currency: token, depositMethod: 'wallet', fallbackAmount: 0.001 }
  for (const gasAmount of [undefined, NaN, Infinity, -0.01]) {
    assert.equal(resolveMaxAllowedAmount({ ...input, gasAmount }), undefined)
  }
  assert.equal(resolveMaxAllowedAmount({ ...input, gasAmount: 0 }), 1)
})
