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
const { getKey, useBalanceStore } = await import('../dist/esm/stores/balanceStore.js')
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
  useBalanceStore.setState({ balances: {
    [getKey('source', network.name)]: { status: 'success', data: { balances: state.balances } },
  } })
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

test('Using max can be turned off during gas estimation without changing the amount', async () => {
  await render()
  assert.equal(maxButton().disabled, true)
  await settle(state.requests[0], 0.01)
  assert.equal(maxButton().disabled, false)

  await act(() => maxButton().click())
  assert.equal(formik.values.amount, '0.9898')
  assert.equal(state.requests.length, 2)
  assert.equal(state.requests[1].args.amount, 0.9898)
  assert.equal(maxButton().disabled, false)
  assert.equal(maxButton().textContent, 'Max')
  assert.equal(maxButton().getAttribute('aria-pressed'), 'true')

  await act(() => maxButton().click())
  assert.equal(formik.values.amount, '0.9898')
  assert.equal(formik.values.amountMode, 'manual')
  assert.equal(maxButton().textContent, 'Max')
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

for (const amount of [0, '0', '0.']) {
  test(`Max reserves gas when the amount is reset to ${JSON.stringify(amount)}`, async () => {
    await render()
    await settle(state.requests[0], 0.01)
    await act(() => formik.setFieldValue('amount', amount))
    assert.equal(state.requests.length, 2)
    assert.equal(state.requests[1].args.amount, 1, 'Probe the balance instead of zero')
    assert.equal(maxButton().disabled, false, 'Keep the preset available while its next estimate loads')
    await settle(state.requests[1], 0.01)
    assert.equal(maxButton().disabled, false)
    await act(() => maxButton().click())
    assert.equal(formik.values.amount, '0.9898')
  })
}

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
  assert.equal(formik.values.amount, '10', 'Max also respects the route limit')
})

test('without a wallet Max waits for route limits and uses them when loaded', async () => {
  state.account = undefined
  state.wallets = []
  props.limitsMaxAmount = undefined
  await render()
  assert.equal(maxButton().disabled, true)
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

test('Max keeps the native reserve (Solana rent-exempt minimum) on top of the fee', () => {
  const sol = { symbol: 'SOL', decimals: 9, price_in_usd: 100 }
  const input = { walletBalance: { amount: 0.00468252 }, fromCurrency: sol, native_currency: sol, depositMethod: 'wallet', fallbackAmount: 0.0001, gasAmount: 0.000005 }
  // Without the reserve this left 100 lamports behind and failed simulation.
  assert.equal(resolveMaxAllowedAmount({ ...input, gasReserve: 0.00089088 }), 0.003786539)
  assert.equal(resolveMaxAllowedAmount({ ...input, walletBalance: { amount: 0.0008 }, gasReserve: 0.00089088 }), 0)
})

test('selecting a new preset replaces the active selection', async () => {
  await render()
  await settle(state.requests[0], 0.01)
  await act(() => maxButton().click())
  await settle(state.requests[1], 0.01)
  const half = container.querySelector('[data-attr="half-amount"]')
  await act(() => half.click())
  assert.equal(formik.values.amountMode, 'half')
  assert.equal(half.getAttribute('aria-pressed'), 'true')
  assert.equal(maxButton().getAttribute('aria-pressed'), 'false')
  const min = container.querySelector('[data-attr="min-amount"]')
  await act(() => min.click())
  assert.equal(formik.values.amountMode, 'min')
  assert.equal(min.getAttribute('aria-pressed'), 'true')
  assert.equal(half.getAttribute('aria-pressed'), 'false')
})

test('50% stays available through repeated Max amount and balance refreshes', async () => {
  await render()
  await settle(state.requests[0], 0.01)
  const half = container.querySelector('[data-attr="half-amount"]')
  await act(() => maxButton().click())
  assert.equal(half.disabled, false, 'Selecting Max must not disable 50% during the next fee request')

  for (const [balance, amount] of [[1, '0.9796'], [2, '1.9796']]) {
    await settle(state.requests.at(-1), 0.02)
    state.balances = [{ ...state.balances[0], amount: balance }]
    await act(() => formik.setFieldValue('amount', amount))
    assert.equal(half.disabled, false)
    assert.equal(half.getAttribute('aria-pressed'), 'false')
    assert.equal(maxButton().getAttribute('aria-pressed'), 'true')
  }

  // Switching during the refresh selects a provisional value and requires the
  // live controller to resolve it, rather than silently ignoring the click.
  await act(() => half.click())
  assert.equal(formik.values.amountMode, 'half')
  assert.equal(formik.values.amount, '0.9898')
  assert.equal(formik.values.amountPresetPending, true)
  assert.equal(maxButton().disabled, false)
})

test('a settled missing or failed fee disables unselected presets after the loading gap', async () => {
  await render()
  await settle(state.requests[0], 0.01)
  await act(() => maxButton().click())
  const half = container.querySelector('[data-attr="half-amount"]')
  assert.equal(half.disabled, false)
  await settle(state.requests[1], undefined)
  assert.equal(half.disabled, true, 'A completed request without an estimate is not a background refresh')
  assert.equal(maxButton().disabled, false, 'The selected preset can still be turned off')
  await act(() => formik.setFieldValue('amount', '0.8'))
  assert.equal(half.disabled, true, 'The missing estimate must clear the previous preview')
  await settle(state.requests[2], 0.02)
  assert.equal(half.disabled, false)
  await act(() => formik.setFieldValue('amount', '0.7'))
  assert.equal(half.disabled, false)
  await act(async () => {
    state.requests[3].reject(new Error('RPC unavailable'))
    await state.requests[3].promise.catch(() => undefined)
  })
  assert.equal(half.disabled, true)
})

for (const change of ['account', 'network', 'token']) {
  test(`a previous fee cannot keep presets enabled after changing ${change}`, async () => {
    if (change === 'token') props.from = { ...network, token: undefined }
    await render()
    await settle(state.requests[0], 0.01)
    if (change === 'account') state.account = { ...state.account, address: 'other-source' }
    else if (change === 'network') {
      props.from = { ...network, name: 'BASE_MAINNET' }
      state.balances = [{ ...state.balances[0], network: 'BASE_MAINNET' }]
    } else {
      props.fromCurrency = { ...token, symbol: 'OTHER' }
      state.balances = [{ ...state.balances[0], token: 'OTHER' }]
    }
    await render()
    assert.equal(maxButton().disabled, true)
    assert.equal(container.querySelector('[data-attr="half-amount"]').disabled, true)
    await settle(state.requests[1], 0.03)
    assert.equal(maxButton().disabled, false)
    await act(() => maxButton().click())
    assert.equal(formik.values.amount, '0.9694')
  })
}

test('Min selects the route minimum even when the balance is too low', async () => {
  state.balances = [{ ...state.balances[0], amount: 0.0001 }]
  props.limitsMinAmount = 0.00100001
  props.fromCurrency = { ...token, decimals: 6 }
  await render()
  await act(() => container.querySelector('[data-attr="min-amount"]').click())
  assert.equal(formik.values.amount, '0.001001')
  assert.equal(formik.values.amountMode, 'min')
})

test('one-time 50% retains the production zero fallback while route limits are unavailable', async () => {
  state.account = undefined
  state.wallets = []
  props.limitsMinAmount = undefined
  props.limitsMaxAmount = undefined
  await render()

  const group = container.querySelector('[role="group"][aria-label="Amount shortcuts"]')
  assert.equal(group.getAttribute('aria-disabled'), 'false')
  assert.equal(group.querySelectorAll('button:disabled').length, 2)
  await act(() => container.querySelector('[data-attr="half-amount"]').click())
  assert.equal(formik.values.amount, '0')
  assert.equal(formik.values.amountMode, 'fixed')

  props.limitsMinAmount = 0.001
  await render()
  assert.equal(group.getAttribute('aria-disabled'), 'false')
  assert.equal(group.querySelectorAll('button:disabled').length, 1)
  await act(() => container.querySelector('[data-attr="min-amount"]').click())
  assert.equal(formik.values.amountMode, 'fixed')
  assert.equal(formik.values.amount, '0.001')
})

for (const [balance, expected] of [[1.000003, '0.500001'], [0, '0.25']]) {
  test(`one-time 50% matches production for balance ${balance} with a smaller route cap`, async () => {
    props.depositMethod = 'deposit_address'
    props.fromCurrency = { ...token, decimals: 6 }
    props.limitsMaxAmount = 0.5
    state.balances = [{ ...state.balances[0], amount: balance }]
    await render()
    const half = container.querySelector('[data-attr="half-amount"]')
    assert.equal(half.disabled, false, 'One-time 50% does not wait for a gas estimate')
    await act(() => half.click())
    assert.equal(formik.values.amount, expected)
    assert.equal(formik.values.amountMode, 'fixed')
    assert.equal(half.getAttribute('aria-pressed'), null)
  })
}

for (const mode of ['min', 'half', 'max']) {
  test(`selected ${mode} can still be turned off when all preset data becomes unavailable`, async () => {
    await render()
    await settle(state.requests[0], 0.01)
    const button = container.querySelector(`[data-attr="${mode}-amount"]`)
    await act(() => button.click())
    const selectedAmount = formik.values.amount

    state.balances = undefined
    props.limitsMinAmount = undefined
    props.limitsMaxAmount = undefined
    await render()

    const group = container.querySelector('[role="group"][aria-label="Amount presets"]')
    assert.equal(group.getAttribute('aria-disabled'), 'false')
    assert.equal(group.querySelectorAll('button:disabled').length, 2)
    assert.equal(button.disabled, false)
    assert.equal(button.getAttribute('aria-pressed'), 'true')
    assert.equal(formik.values.amount, selectedAmount)

    await act(() => button.click())
    assert.equal(formik.values.amountMode, 'manual')
    assert.equal(formik.values.amount, selectedAmount)
    assert.equal(group.getAttribute('aria-disabled'), 'true')
    assert.equal(group.querySelectorAll('button:disabled').length, 3)
  })
}
