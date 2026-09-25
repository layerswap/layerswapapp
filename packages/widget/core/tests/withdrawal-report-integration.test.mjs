import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement, StrictMode } from 'react'
import axios, { AxiosError } from 'axios'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://widget.test' })
const previous = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document,
  localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true })) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
const moduleUrl = source => 'data:text/javascript,' + encodeURIComponent(source)
const fixtureUrl = moduleUrl(`
  export const state = { wallet: { id:'wallet', address:'source', isActive:true, providerName:'test-wallet' } }
  export const useSelectedAccount = () => state.wallet
  export const useSwapDataState = () => state.swap
  export const useSwapDataUpdate = () => ({ setSwapId() {}, setQuoteLoading() {}, createSwap() { throw new Error('unexpected creation') } })
  export const useInitialSettings = () => ({})
  export const useSettingsState = () => ({ networks: [] })
  export const useWalletWithdrawalState = () => ({ onWalletWithdrawalSuccess() { state.successes++ } })
  export const useBalance = () => ({ balances: [] })
  export const useConnectModal = () => ({})
  export const resolvePriceImpactValues = () => ({})
  export const WalletIcon = () => null
  export const Loader2 = () => null
  export const ErrorDisplay = () => null
  export const ICON_CLASSES_WARNING = ''
  export const sleep = () => Promise.resolve()
  export default () => null
`)
const buttonUrl = moduleUrl(`
  import { createElement } from ${JSON.stringify(import.meta.resolve('react'))}
  import { state } from ${JSON.stringify(fixtureUrl)}
  export default ({ children, onClick, isDisabled }) => createElement('button', {
    disabled: isDisabled, onClick: () => { state.pending = onClick?.() }
  }, children)
`)
const settingsUrl = moduleUrl('export default { LayerswapApiUri:"https://api.test", LayerswapApiKeys:{ mainnet:"test-secret-api-key" }, ApiVersion:"mainnet" }')
const fixtures = ['/context/swap', '/context/swapAccounts', '/context/settings', '/context/withdrawalContext',
  '/lib/balances/useBalance', '/components/Wallet/WalletModal', '/lib/fees', '/validationError/ErrorDisplay',
  '/validationError/ErrorDismissButton', '/validationError/constants', '/Icons/FailIcon', '/Icons/InfoIcon', '/messages/Message']
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('/AppSettings')) return { url: settingsUrl, shortCircuit: true }
  if (context.parentURL?.endsWith('/Wallet/Common/buttons.js')) {
    if (specifier.endsWith('/Buttons/submitButton')) return { url: buttonUrl, shortCircuit: true }
    if (specifier.endsWith('/hooks/useWallet')) return { url: moduleUrl(`import { state } from ${JSON.stringify(fixtureUrl)}; export default () => ({ wallets:[state.wallet] })`), shortCircuit: true }
    if (specifier.endsWith('/lib/gases/useSWRGas')) return { url: moduleUrl('export default () => ({})'), shortCircuit: true }
    if (fixtures.some(s => specifier.endsWith(s)) || ['@layerswap/utils', '@layerswap/ui-kit/components', 'lucide-react'].includes(specifier)) return { url: fixtureUrl, shortCircuit: true }
  }
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) return nextResolve(specifier + '.js', context)
  return nextResolve(specifier, context)
} })
const oldAdapter = axios.defaults.adapter
let requests = 0, originalError
axios.defaults.adapter = async config => {
  requests++
  originalError = new AxiosError('Authorization unavailable', 'ERR_BAD_RESPONSE', config, {}, {
    status: 503, statusText: 'Unavailable', headers: {}, config,
    data: { error: { code: 'SERVER_ERROR', message: 'Unavailable' }, echoedRequest: config.data },
  })
  throw originalError
}
const { state } = await import(fixtureUrl)
const { createRoot } = await import('react-dom/client')
const { CallbackProvider } = await import('../dist/esm/context/callbackProvider.js')
const { ErrorProvider } = await import('../dist/esm/context/ErrorProvider.js')
const { registerWidgetErrorLogger } = await import('../dist/esm/lib/ErrorHandler.js')
const { SendTransactionButton } = await import('../dist/esm/components/Pages/Swap/Withdraw/Wallet/Common/buttons.js')
const { useGaslessPreferenceStore } = await import('../dist/esm/stores/gaslessPreferenceStore.js')

const basic = { requested_amount: '1', source_network: { name: 'A' }, destination_network: { name: 'B' },
  source_token: { symbol: 'X' }, destination_token: { symbol: 'Y' }, destination_address: 'destination', use_deposit_address: false }
let container, root, errors, lifecycle
beforeEach(() => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  requests = 0; errors = []; lifecycle = []; state.successes = 0
  state.swap = { swapId: 'swap-1', swapDetails: { ...basic, id: 'swap-1', status: 'user_transfer_pending', transactions: [] },
    depositActionsResponse: [{ type: 'sign', typed_data: { message: { validBefore: '9999999999' } } }], setSwapError() {} }
  registerWidgetErrorLogger()
})
afterEach(async () => {
  await act(async () => root.unmount()); container.remove()
  useGaslessPreferenceStore.getState().resetGaslessPreference()
})
after(() => {
  axios.defaults.adapter = oldAdapter
  hooks.deregister(); dom.window.close()
  for (const key of ['window', 'document', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT']) {
    if (previous[key]) Object.defineProperty(globalThis, key, previous[key]); else delete globalThis[key]
  }
})
async function clickTransfer(onSign) {
  await act(async () => root.render(createElement(StrictMode, null,
    createElement(CallbackProvider, { callbacks: { onSwapLifecycle: e => lifecycle.push(e) } },
      createElement(ErrorProvider, { onError: e => errors.push(e) },
        createElement(SendTransactionButton, { swapData: basic, refuel: false, onSign,
          onClick: () => assert.fail('gasless should sign, not send a transaction') }))))))
  assert.equal(container.querySelector('button').textContent, 'Swap now')
  await act(async () => { container.querySelector('button').click(); await state.pending })
}

test('real transfer button, gasless execution, API client and host logger share the safe reporting boundary', async () => {
  await clickTransfer(async () => 'test-secret-authorization')
  assert.equal(requests, 1)
  assert.deepEqual(errors.map(e => e.type), ['APIError', 'SwapWithdrawalError'])
  assert.doesNotMatch(JSON.stringify(errors), /test-secret-|X-LS-APIKEY|echoedRequest|"config"|"headers"/)
  assert.deepEqual(lifecycle.map(e => e.step), ['wallet_prompt_opened', 'gasless_authorization_failed'])
  assert.equal(errors[0].occurrenceId, errors[1].occurrenceId)
  assert.equal(errors[0].occurrenceId, lifecycle[1].occurrenceId)
  assert.equal(errors[1].cause.method, 'post')
  assert.equal(errors[1].cause.status, 503)
  assert.ok(originalError.config.data.includes('test-secret-authorization'), 'recovery still has the original failure')
  assert.equal(state.successes, 0)
  assert.match(container.textContent, /Switch to standard transfer/)
})

test('wallet declines keep their classification and never become host errors or authorize requests', async () => {
  await clickTransfer(async () => { throw Object.assign(new Error('Wallet declined'), { code: 4001 }) })
  assert.equal(requests, 0)
  assert.deepEqual(errors, [])
  assert.deepEqual(lifecycle.map(e => e.step), ['wallet_prompt_opened', 'wallet_action_rejected'])
  assert.equal(lifecycle[1].reasonCode, 'user_rejected')
  assert.equal(state.successes, 0)
})
