import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { existsSync } from 'node:fs'
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
const widgetModule = path => new URL(`../dist/esm/${path}.js`, import.meta.url).href
const fixtureUrl = moduleUrl(`
  export const state = { wallet: { id:'wallet', address:'source', isActive:true, providerName:'test-wallet', provider:{}, asSourceSupportedNetworks:['A'] } }
  export const useSelectedAccount = () => state.wallet
  export const useSwapDataState = () => state.swap
  export const useSwapDataUpdate = () => ({
    setSwapId(id) { state.swap.swapId = id }, setQuoteLoading() {}, markWalletExecutionStarted() {},
    setWalletActionExecuting() {}, setSwapModalOpen(open) { state.swap.swapModalOpen = open },
    startFreshSwapAttempt() {
      state.freshAttempts++
      state.swap = { ...state.swap, swapId: undefined, swapDetails: undefined, depositActionsResponse: undefined }
    },
    async createSwap() {
      if (!state.newSwap) throw new Error('unexpected creation')
      state.creations++
      return state.newSwap
    }
  })
  export const useInitialSettings = () => ({})
  export const useSettingsState = () => ({ networks: [] })
  export const useBalance = () => ({ balances: [], mutate() { state.balanceRefreshes++ } })
  export const useConnectModal = () => ({})
  export const resolvePriceImpactValues = () => ({})
  export const WalletIcon = () => null
  export const Loader2 = () => null
  export const ErrorDisplay = () => null
  export const ICON_CLASSES_WARNING = ''
  export const sleep = () => Promise.resolve()
  export const WalletMessageDetails = ({ children }) => children
  export const useAsyncModal = () => ({})
  export const useContractAddressStore = () => ({})
  export const useResolvedSwapStatus = () => ({})
  export const ContractSourceAddressValidationCache = () => null
  export const SwapDetailsSceleton = () => null
  export const generateSwapInitialValuesFromSwap = () => ({ amount: '1', depositMethod: 'wallet' })
  export const generateSwapInitialValues = generateSwapInitialValuesFromSwap
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
const fixtures = ['/context/swap', '/context/swapAccounts', '/context/settings',
  '/lib/balances/useBalance', '/components/Wallet/WalletModal', '/lib/fees', '/validationError/ErrorDisplay',
  '/validationError/ErrorDismissButton', '/validationError/constants', '/Icons/FailIcon', '/Icons/InfoIcon', '/messages/Message']
// Exercise the contained form's real success handler and Formik state. Keep
// drawers, route setup and the unrelated SwapDetails presentation at boundaries.
const formUrl = moduleUrl(`
  import { createElement, Fragment } from ${JSON.stringify(import.meta.resolve('react'))}
  import { Formik } from ${JSON.stringify(import.meta.resolve('formik'))}
  export default ({ initialValues, onSubmit, children }) => createElement(Formik, { initialValues, onSubmit },
    props => createElement(Fragment, null, createElement('output', { id: 'amount' }, String(props.values.amount)), children(props)))
`)
const drawerUrl = moduleUrl(`
  const Drawer = ({ show, children }) => show ? children : null
  Drawer.Snap = ({ children }) => children
  export default Drawer
`)
const containedDetailsUrl = moduleUrl(`
  import { createElement } from ${JSON.stringify(import.meta.resolve('react'))}
  import { state } from ${JSON.stringify(fixtureUrl)}
  import { WithdrawalProvider } from ${JSON.stringify(widgetModule('context/withdrawalContext'))}
  import { SendTransactionButton } from ${JSON.stringify(widgetModule('components/Pages/Swap/Withdraw/Wallet/Common/buttons'))}
  export default ({ onWalletWithdrawalSuccess }) => createElement(WithdrawalProvider, {
    onWalletWithdrawalSuccess() { state.successes++; onWalletWithdrawalSuccess() }
  }, createElement(SendTransactionButton, {
    swapData: state.swap.swapBasicData, refuel: false, onSign: state.onSign, onClick: state.onTransfer
  }))
`)
const formFixtures = ['/context/asyncModal', '/stores/contractAddressStore', '/hooks/useResolvedSwapStatus',
  '/lib/generateSwapInitialValues', '/Common/Sceletons', '/Input/Address/ContractAddressNote',
  '/Input/Address/UrlAddressNote', '/validationError/ContractAddressValidationCache']
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('/AppSettings')) return { url: settingsUrl, shortCircuit: true }
  if (specifier.endsWith('/context/swap') && ['/useSwapRetry.js', '/useResolvedSwapStatus.js', '/useDepositActionPolling.js'].some(path => context.parentURL?.endsWith(path))) {
    return { url: fixtureUrl, shortCircuit: true }
  }
  if (context.parentURL?.endsWith('/Form/FormWrapper.js')) {
    if (specifier === './SwapForm') return { url: formUrl, shortCircuit: true }
    if (specifier === '../Withdraw/SwapDetails') return { url: containedDetailsUrl, shortCircuit: true }
    if (specifier.endsWith('/Modal/vaulModal')) return { url: drawerUrl, shortCircuit: true }
    if (formFixtures.some(path => specifier.endsWith(path))) return { url: fixtureUrl, shortCircuit: true }
  }
  if (['/Wallet/Common/buttons.js', '/Presentation/WalletActionsView.js', '/Form/FormWrapper.js'].some(path => context.parentURL?.endsWith(path))) {
    if (specifier.endsWith('/Buttons/submitButton')) return { url: buttonUrl, shortCircuit: true }
    if (specifier.endsWith('/hooks/useWallet')) return { url: moduleUrl(`import { state } from ${JSON.stringify(fixtureUrl)}; export default () => ({ wallets:[state.wallet], getProvider() {} })`), shortCircuit: true }
    if (specifier.endsWith('/lib/gases/useSWRGas')) return { url: moduleUrl('export default () => ({})'), shortCircuit: true }
    if (fixtures.some(s => specifier.endsWith(s)) || ['@layerswap/utils', '@layerswap/ui-kit/components', 'lucide-react'].includes(specifier)) return { url: fixtureUrl, shortCircuit: true }
  }
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
    const file = new URL(specifier + '.js', context.parentURL)
    return nextResolve(existsSync(file) ? specifier + '.js' : specifier + '/index.js', context)
  }
  return nextResolve(specifier, context)
} })
const oldAdapter = axios.defaults.adapter
let requests = 0, originalError
axios.defaults.adapter = async config => {
  state.apiCalls.push([config.method, config.url])
  if (config.method === 'get' && config.url.includes('/deposit_actions')) {
    return { status: 200, statusText: 'OK', headers: {}, config, data: { data: state.swap.depositActionsResponse } }
  }
  if (config.method === 'get' && config.url.endsWith('/authorize')) {
    return { status: 200, statusText: 'OK', headers: {}, config, data: { data: state.authorization } }
  }
  requests++
  if (state.authorizeSucceeds && config.method === 'post' && (config.url.endsWith('/authorize') || config.url.endsWith('/deposit_speedup'))) {
    return { status: 200, statusText: 'OK', headers: {}, config, data: {} }
  }
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
const { WithdrawalProvider } = await import('../dist/esm/context/withdrawalContext.js')
const { default: FormWrapper } = await import('../dist/esm/components/Pages/Swap/Form/FormWrapper.js')
const { useGaslessPreferenceStore } = await import('../dist/esm/stores/gaslessPreferenceStore.js')
const { useSwapTransactionStore, useDepositSignatureStore, useGaslessAuthorizationStore } = await import('../dist/esm/stores/swapTransactionStore.js')
const { useGaslessAuthorization } = await import('../dist/esm/hooks/useGaslessAuthorization.js')
const { useGaslessAuthorizationStatus } = await import('../dist/esm/hooks/useGaslessAuthorizationStatus.js')
const { useSwapRetry } = await import('../dist/esm/hooks/useSwapRetry.js')
const { resolveSwapPhase } = await import('../dist/esm/components/utils/resolveSwapPhase.js')
const { SWRConfig, default: useSWR } = await import('swr')
const { default: LayerSwapApiClient } = await import('../dist/esm/lib/apiClients/layerSwapApiClient.js')

// Stands in for the swap provider, which schedules deposit-action refreshes for every reader of the key.
const depositActionsClient = new LayerSwapApiClient()
function DepositActionsSchedule() {
  useSWR('/swaps/swap-1/deposit_actions?source_address=source', () => depositActionsClient.GetDepositActionsAsync('swap-1', 'source'), { refreshInterval: 2000, dedupingInterval: 1000 })
  return null
}

const basic = { requested_amount: '1', source_network: { name: 'A' }, destination_network: { name: 'B' },
  source_token: { symbol: 'X', contract: '0xtoken', supports_gasless_deposit: true, gasless_standard: 'eip3009' }, destination_token: { symbol: 'Y' }, destination_address: 'destination', use_deposit_address: false }
let container, root, errors, lifecycle, swrConfig
beforeEach(() => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  requests = 0; errors = []; lifecycle = []; state.successes = 0
  state.apiCalls = []; state.authorizeSucceeds = false
  state.authorization = { status: 'initiated' }
  state.freshAttempts = 0; state.creations = 0; state.newSwap = undefined
  state.balanceRefreshes = 0
  localStorage.clear()
  useSwapTransactionStore.setState({ swapTransactions: {} })
  useDepositSignatureStore.setState({ signatures: {} })
  useGaslessAuthorizationStore.setState({ authorizations: {} })
  swrConfig = { provider: () => new Map(), revalidateOnFocus: false, revalidateOnReconnect: false, isVisible: () => true }
  state.swap = { swapId: 'swap-1', swapDetails: { ...basic, id: 'swap-1', status: 'user_transfer_pending', transactions: [] },
    depositActionsResponse: [{ type: 'sign', step: 'sign', status: 'action_required', typed_data: { message: { validBefore: '9999999999' } } }], setSwapError() {} }
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
async function clickTransfer(onSign, { onClick = () => assert.fail('gasless should sign, not send a transaction'), waitForCompletion = true, label = 'Sign to swap' } = {}) {
  await act(async () => root.render(createElement(StrictMode, null,
    createElement(SWRConfig, { value: swrConfig },
    createElement(DepositActionsSchedule),
    createElement(CallbackProvider, { callbacks: { onSwapLifecycle: e => lifecycle.push(e) } },
      createElement(ErrorProvider, { onError: e => errors.push(e) },
        createElement(WithdrawalProvider, { onWalletWithdrawalSuccess() { state.successes++ } },
          createElement(SendTransactionButton, { swapData: basic, refuel: false, onSign,
            onClick }))))))))
  assert.equal(container.querySelector('button').textContent, label)
  await act(async () => { container.querySelector('button').click(); if (waitForCompletion) await state.pending })
}

let retryActions
function RetryControls() {
  const authorization = useGaslessAuthorizationStatus(state.swap.swapId, state.swap.depositActionsResponse)
  state.swap.gaslessAuthorization = authorization
  const { failureStatus } = useGaslessAuthorization(state.swap.swapDetails, state.swap.depositActionsResponse, authorization)
  state.swap.resolved = resolveSwapPhase({
    swapDetails: state.swap.swapDetails, gaslessFailureStatus: failureStatus,
  })
  retryActions = useSwapRetry()
  return createElement('div', null,
    createElement('button', { id: 'retry', disabled: !retryActions.canRetry, onClick: retryActions.retry }, 'Try again'),
    createElement('button', { id: 'standard', disabled: !retryActions.canSwitchToStandard, onClick: retryActions.switchToStandard }, 'Switch to standard transfer'))
}

const renderRetryControls = () => act(async () => root.render(createElement(StrictMode, null,
  createElement(SWRConfig, { value: swrConfig }, createElement(RetryControls)))))

async function failSignOnlyAuthorization(t, status, beforeFailure = () => {}) {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
  state.authorizeSucceeds = true
  const sign = { ...state.swap.depositActionsResponse[0], signing_standard: 'eip3009' }
  state.swap.depositActionsResponse = [sign]
  await clickTransfer(async () => 'signature', { waitForCompletion: false })
  assert.ok(useDepositSignatureStore.getState().signatures['swap-1'], 'the accepted sign-only authorization starts unclassified')
  await act(async () => beforeFailure())
  state.swap.depositActionsResponse = [{ ...sign, status: 'completed' }]
  state.authorization = { status }
  await act(async () => { t.mock.timers.tick(4000) })
  await state.pending
  assert.equal(state.successes, 0)
}

for (const status of ['expired', 'insufficient', 'rejected']) {
  for (const reload of [false, true]) {
    test(`${status} sign-only authorization can ${reload ? 'reload and switch to standard' : 'retry'} with a fresh swap`, async t => {
      await failSignOnlyAuthorization(t, status)
      if (reload) {
        await act(async () => root.unmount())
        const persisted = Object.fromEntries(['depositSignatures', 'gaslessAuthorizations'].map(key => [key, localStorage.getItem(key)]))
        for (const store of [useDepositSignatureStore, useGaslessAuthorizationStore]) store.setState(store.getInitialState(), true)
        for (const [key, value] of Object.entries(persisted)) localStorage.setItem(key, value)
        await useDepositSignatureStore.persist.rehydrate()
        await useGaslessAuthorizationStore.persist.rehydrate()
        root = createRoot(container)
      }
      await renderRetryControls()
      const retry = container.querySelector(reload ? '#standard' : '#retry')
      assert.equal(retry.disabled, false, 'a definitive authorization failure must allow recovery')
      await act(async () => retry.click())
      assert.equal(state.freshAttempts, 1)
      assert.equal(state.swap.swapId, undefined)
      assert.equal(useDepositSignatureStore.getState().signatures['swap-1'], undefined)
      assert.deepEqual(useGaslessAuthorizationStore.getState().authorizations['swap-1'], { kind: 'gasless', validBefore: 9999999999 }, 'retry retains the signed-action receipt as history')
      assert.equal(useGaslessPreferenceStore.getState().gaslessEnabled, !reload)

      state.newSwap = {
        swap: { ...basic, id: 'fresh-swap', metadata: {}, status: 'user_transfer_pending', transactions: [] },
        quote: { receive_amount: 1 },
        deposit_actions: [{ type: 'sign', step: 'sign', status: 'action_required', typed_data: { message: { nonce: 'fresh' } } }],
      }
      let prompts = 0
      await clickTransfer(async action => {
        prompts++
        assert.equal(action.typed_data.message.nonce, 'fresh')
        throw Object.assign(new Error('Wallet declined'), { code: 4001 })
      }, { label: 'Swap now' })
      assert.equal(state.creations, 1)
      assert.equal(state.swap.swapId, 'fresh-swap')
      assert.equal(prompts, 1, 'retry reaches a new wallet request instead of the terminal authorization')
    })
  }
}

test('a terminal authorization response preserves an existing transaction and keeps retries blocked', async t => {
  const transaction = { transaction_hash: 'known-pending-hash', status: 'pending' }
  await failSignOnlyAuthorization(t, 'expired', () => {
    const store = useGaslessAuthorizationStore.getState()
    store.setGaslessAuthorization('swap-1', 9999999999)
    useSwapTransactionStore.getState().setSwapTransaction('swap-1', transaction.transaction_hash)
  })
  assert.equal(useSwapTransactionStore.getState().swapTransactions['swap-1'].hash, transaction.transaction_hash)
  await renderRetryControls()
  assert.equal(container.querySelector('#retry').disabled, true)
  assert.equal(container.querySelector('#standard').disabled, true)
  await act(async () => { retryActions.retry(); retryActions.switchToStandard() })
  assert.equal(state.freshAttempts, 0)
  assert.equal(state.swap.swapId, 'swap-1')
})

test('a transaction arriving after a terminal failure render still prevents retry', async t => {
  await failSignOnlyAuthorization(t, 'rejected')
  await renderRetryControls()
  assert.equal(container.querySelector('#retry').disabled, false)
  const retry = retryActions.retry
  await act(async () => {
    useSwapTransactionStore.getState().setSwapTransaction('swap-1', 'late-hash')
    retry()
  })
  assert.equal(state.freshAttempts, 0)
  assert.equal(state.swap.swapId, 'swap-1')
  assert.equal(useSwapTransactionStore.getState().swapTransactions['swap-1'].hash, 'late-hash')
})

test('real transfer button, gasless execution, API client and host logger share the safe reporting boundary', async () => {
  state.swap.depositActionsResponse[0].signing_standard = 'permit2'
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

for (const initialPublish of [true, false]) {
test(`the real button resumes ${initialPublish ? 'known' : 'late'} publication from SWR after signing`, async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
  state.authorizeSucceeds = true
  useGaslessPreferenceStore.getState().setGaslessEnabled(false)
  state.swap.swapDetails.metadata = {}
  const sign = state.swap.depositActionsResponse[0]
  const publish = { type: 'transfer', step: 'publish', status: 'waiting', amount: 1, to_address: 'deposit' }
  state.swap.depositActionsResponse = initialPublish ? [sign, publish] : [sign]
  let signs = 0, transfers = 0
  await clickTransfer(async () => { signs++; return 'signature' }, {
    onClick: async () => { transfers++; return 'published-hash' },
    waitForCompletion: false,
  })
  assert.equal(signs, 1)
  const requestsAfterSigning = state.apiCalls.length
  state.swap.depositActionsResponse = initialPublish ? [{ ...sign, status: 'completed' }, publish] : [{ step: 'sign', status: 'completed' }]
  for (let i = 0; i < 14; i++) await act(async () => { t.mock.timers.tick(2000) })
  assert.equal(transfers, 0)
  assert.equal(state.successes, 0)
  assert.ok(state.apiCalls.slice(requestsAfterSigning).every(([method, url]) => method === 'get' && (url.includes('/deposit_actions') || (!initialPublish && url.endsWith('/authorize')))))

  state.swap.depositActionsResponse = [{ ...sign, status: 'completed' }, { ...publish, status: 'action_required' }]
  await act(async () => { t.mock.timers.tick(2000) })
  await state.pending
  assert.equal(signs, 1, 'polling does not reopen the signature prompt')
  assert.equal(transfers, 1)
  assert.equal(state.successes, 1)
  assert.equal(useSwapTransactionStore.getState().swapTransactions['swap-1'].hash, 'published-hash')
  assert.ok(state.apiCalls.filter(([method]) => method === 'get').every(([, url]) => (url.includes('/deposit_actions') || (!initialPublish && url.endsWith('/authorize')))), 'execution never requests a whole swap')
  assert.deepEqual(errors, [])
})
}

for (const initialPublish of [true, false]) {
test(`a transient completed ${initialPublish ? 'known' : 'late'} publication preserves the contained form until wallet submission`, async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
  state.authorizeSucceeds = true
  useGaslessPreferenceStore.getState().setGaslessEnabled(false)
  state.swap.swapBasicData = basic
  state.swap.swapModalOpen = true
  state.swap.swapDetails.metadata = {}
  const sign = state.swap.depositActionsResponse[0]
  const publish = { type: 'transfer', step: 'publish', status: 'waiting', amount: 1, to_address: 'deposit' }
  state.swap.depositActionsResponse = initialPublish ? [sign, publish] : [sign]
  let signs = 0, transfers = 0
  const submission = Promise.withResolvers()
  state.onSign = async () => { signs++; return 'signature' }
  state.onTransfer = async () => { transfers++; return submission.promise }
  const amount = () => container.querySelector('#amount').textContent

  await act(async () => root.render(createElement(StrictMode, null,
    createElement(SWRConfig, { value: swrConfig },
      createElement(DepositActionsSchedule),
      createElement(CallbackProvider, { callbacks: { onSwapLifecycle: e => lifecycle.push(e) } },
        createElement(ErrorProvider, { onError: e => errors.push(e) },
          createElement(FormWrapper, { type: 'cross-chain' })))))))
  assert.equal(amount(), '1')
  await act(async () => { container.querySelector('button').click() })
  assert.equal(signs, 1)
  assert.ok(useDepositSignatureStore.getState().signatures['swap-1'])

  state.swap.depositActionsResponse = [{ ...sign, status: 'completed' }, { ...publish, status: 'completed' }]
  await act(async () => { t.mock.timers.tick(2000) })
  await state.pending
  assert.equal(state.successes, 0, 'server action completion is provisional without a wallet submission')
  assert.equal(amount(), '1')
  assert.equal(useGaslessPreferenceStore.getState().gaslessEnabled, false, 'retain the selected execution preference')
  assert.equal(state.balanceRefreshes, 0)
  assert.ok(useDepositSignatureStore.getState().signatures['swap-1'], 'retain the accepted signature for corrected actions')
  assert.equal(container.querySelector('button').disabled, true)

  state.swap.depositActionsResponse = [{ ...sign, status: 'completed' }, { ...publish, status: 'action_required' }]
  await act(async () => { t.mock.timers.tick(2000) })
  const confirm = container.querySelector('button')
  assert.equal(confirm.textContent, 'Confirm swap')
  assert.equal(confirm.disabled, false)
  assert.equal(amount(), '1')
  assert.equal(useGaslessPreferenceStore.getState().gaslessEnabled, false)
  await act(async () => confirm.click())
  assert.equal(signs, 1, 'correction resumes publication without signing again')
  assert.equal(transfers, 1)
  assert.equal(state.successes, 0, 'an open wallet prompt is not a submission')
  assert.equal(amount(), '1')

  await act(async () => { submission.resolve('published-hash'); await state.pending })
  assert.equal(state.successes, 1)
  assert.equal(amount(), '0', 'the confirmed wallet submission clears the form')
  assert.equal(useGaslessPreferenceStore.getState().gaslessEnabled, true)
  assert.equal(state.balanceRefreshes, 1)
  assert.equal(useDepositSignatureStore.getState().signatures['swap-1'], undefined)
  assert.equal(useSwapTransactionStore.getState().swapTransactions['swap-1'].hash, 'published-hash')
  assert.equal(state.creations, 0)
  assert.deepEqual(errors, [])
})
}
