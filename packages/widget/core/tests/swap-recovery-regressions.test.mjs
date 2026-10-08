import assert from 'node:assert/strict'
import test, { beforeEach, afterEach, after } from 'node:test'
import { readFileSync, existsSync } from 'node:fs'
import { registerHooks, createRequire } from 'node:module'
import { extname } from 'node:path'
import ts from 'typescript'
import React, { act, createElement, useEffect } from 'react'
import { JSDOM } from 'jsdom'
import { createSwapContext } from './helpers/swap-context.mjs'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://widget.test', pretendToBeVisual: true })
const previous = Object.getOwnPropertyDescriptors(globalThis)
const globals = { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
  sessionStorage: dom.window.sessionStorage, IS_REACT_ACT_ENVIRONMENT: true,
  HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, SVGElement: dom.window.SVGElement,
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
  cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window) }
for (const [key, value] of Object.entries(globals)) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
const apiModule = 'data:text/javascript,' + encodeURIComponent(`
  export const TransactionStatus = { Pending: 'pending', Completed: 'completed', Failed: 'failed' }
  export const BackendTransactionStatus = TransactionStatus
  export const TransactionType = { Input: 'input', Output: 'output', Refuel: 'refuel' }
  export const state = {}
  export default class Client {
    fetcher = async () => ({ data: state.snapshot.data.deposit_actions })
    GetSwapAsync = async id => { state.swapReads.push(id); return state.reconcile ? state.reconcile(id) : state.snapshot }
    GetDepositActionsAsync = async () => ({ data: state.snapshot.data.deposit_actions })
    GetTransactionStatus = async (network, hash) => {
      state.receiptCalls.push([network, hash])
      if (state.receiptRead) return state.receiptRead(network, hash)
      return { data: { status: state.receiptStatus } }
    }
    GetGaslessAuthorizationAsync = async () => { state.authorizationReads++; return state.read() }
    AuthorizeSwapAsync = async () => {}
    SwapCatchup = async (...args) => state.catchup(...args)
  }
`)
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('/apiClients/layerSwapApiClient')) return { url: apiModule, shortCircuit: true }
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
    const file = new URL(specifier + '.js', context.parentURL)
    return nextResolve(existsSync(file) ? specifier + '.js' : specifier + '/index.js', context)
  }
  return nextResolve(specifier, context)
} })
const { createRoot } = await import('react-dom/client')
const swr = await import('swr')
const { SWRConfig } = swr
const api = await import(apiModule)
const { default: Client, state } = api
const stores = await import('../dist/esm/stores/swapTransactionStore.js')
const gasless = await import('../dist/esm/helpers/gasless.js')
const swapProgress = await import('../dist/esm/helpers/swapProgress.js')
const { authorizationKey } = await import('../dist/esm/helpers/swapKeys.js')
const failure = await import('../dist/esm/hooks/useGaslessAuthorization.js')
const { resolveSwapPhase } = await import('../dist/esm/components/utils/resolveSwapPhase.js')
const { useGaslessAuthorizationStatus } = await import('../dist/esm/hooks/useGaslessAuthorizationStatus.js')
const { useInputTransactionStatus } = await import('../dist/esm/hooks/useInputTransactionStatus.js')
const { reconcileSwap } = await import('../dist/esm/lib/swapReconciliation.js')
const { executeProviderWithdrawal, getProviderDepositActions } = await import('../dist/esm/components/Pages/Swap/Withdraw/WithdrawalProviders/executeProviderWithdrawal.js')
const { executeWalletOperation } = await import('../dist/esm/components/Pages/Swap/Withdraw/Wallet/Common/executeWalletOperation.js')
const sourceChain = await import('../dist/esm/components/Pages/Swap/Withdraw/Wallet/Common/ensureSourceChain.js')
const lifecycle = await import('../dist/esm/lib/swapLifecycle.js')
const { truncateToDecimals } = await import('../dist/esm/components/utils/RoundDecimals.js')
const noop = () => {}
const account = { id: 'wallet', address: 'source', providerName: 'test-wallet', isActive: true, provider: {},
  asSourceSupportedNetworks: ['BASE_MAINNET'] }
const context = createSwapContext({ Client, getSwapId: () => 'A', getAccount: () => account,
  stores, swr, authorizationHook: useGaslessAuthorizationStatus, getSwapData: () => state.snapshot,
  dependencies: {
    '@/helpers/gasless': gasless,
    '@/helpers/swapProgress': swapProgress,
    '@/hooks/useGaslessAuthorization': failure,
    '@/components/utils/resolveSwapPhase': { resolveSwapPhase },
  },
})
const require = createRequire(import.meta.url)
function loadSource(path, imports) {
  const { outputText } = ts.transpileModule(readFileSync(new URL('../src/' + path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', outputText)(name => {
    if (name === 'react/jsx-runtime') return require(name)
    if (name in imports) return imports[name]
    throw new Error('Unexpected dependency: ' + name)
  }, module, module.exports)
  return module.exports
}
let root, container, config, observed, presented, withdrawal, withdrawalHook, sendView, commonWithdrawal
const { useGaslessAuthorizationStore: authorizations, useSwapTransactionStore: transactions,
  useDepositSignatureStore: signatures } = stores
beforeEach(() => {
  for (const store of [authorizations, transactions, signatures]) store.setState(store.getInitialState(), true)
  Object.assign(state, {
    receiptCalls: [], receiptStatus: 'pending', receiptRead: undefined, authorizationReads: 0,
    read: async () => ({ data: { status: 'initiated' } }),
    events: [], observations: [], errors: [], successes: 0, executeTransfer: undefined, swapReads: [], reconcile: undefined,
    mounts: 0, unmounts: 0, reducedMotion: true,
    catchup: async () => {},
    historySwaps: [], terminalHistorySwaps: [],
    snapshot: { data: { swap: {
      id: 'A', quote_revision: 7, source_network: { name: 'BASE_MAINNET' }, source_token: { decimals: 6 },
      destination_network: { name: 'BASE_MAINNET' }, destination_token: {}, destination_address: 'destination',
      requested_amount: 1, status: 'user_transfer_pending', use_deposit_address: false, transactions: [],
    }, deposit_actions: [{ step: 'sign', type: 'sign', signing_standard: 'permit2', status: 'completed' }] } },
  })
  config = { provider: () => new Map(), revalidateOnFocus: false, revalidateOnReconnect: false }
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  observed = undefined
  presented = undefined
  commonWithdrawal = false
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})
after(() => {
  hooks.deregister()
  dom.window.close()
  for (const key of Object.keys(globals)) {
    if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
    else delete globalThis[key]
  }
})
function Probe() {
  observed = context.useSwapDataState()
  const { setSwapViewMounted } = context.useSwapDataUpdate()
  useEffect(() => { setSwapViewMounted(true); return () => setSwapViewMounted(false) }, [setSwapViewMounted])
  return null
}
const render = child => act(async () => root.render(createElement(SWRConfig, { value: config },
  createElement(context.SwapDataProvider, null, createElement(Probe), child))))

test('a published gasless hash survives omission and reload, and retry checks its receipt', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
  signatures.getState().setDepositSignature('A', 99999999)
  state.read = async () => ({ data: { status: 'published', transaction: { transaction_hash: '0xobserved', status: 'pending' } } })
  await render()
  assert.equal(observed.resolved.phase, 'input_pending')
  assert.equal(signatures.getState().signatures.A, undefined)
  assert.deepEqual(authorizations.getState().authorizations.A, {
    kind: 'gasless', validBefore: 0, transaction: { transaction_hash: '0xobserved' },
  }, 'only recovery evidence is persisted')
  state.read = async () => ({ data: { status: 'expired' } })
  await act(async () => t.mock.timers.tick(4000))
  assert.equal(observed.resolved.phase, 'input_pending', 'the retained hash keeps its receipt subscription')

  const persisted = localStorage.getItem('gaslessAuthorizations')
  await act(async () => {
    authorizations.setState(authorizations.getInitialState(), true)
    localStorage.setItem('gaslessAuthorizations', persisted)
    await authorizations.persist.rehydrate()
  })
  state.receiptCalls = []
  const reconcile = () => reconcileSwap('A', 'source', { authorization: authorizations.getState().authorizations.A }, new Client())
  assert.equal((await reconcile()).canRestart, false)
  assert.deepEqual(state.receiptCalls, [['BASE_MAINNET', '0xobserved']])
  state.receiptStatus = 'failed'
  assert.equal((await reconcile()).canRestart, true, 'a failed receipt permits replacement')
})

const Processing = loadSource('components/Pages/Swap/Withdraw/Processing/Processing.tsx', {
  react: React, '@/context/swap': context, '@/stores/swapTransactionStore': stores,
  '@/components/Common/CountDownTimer': { default: () => null },
  '@/context/callbackProvider': { useCallbacks: () => ({ onSwapLifecycle: noop }) },
  '@/context/depositSettings': { useDepositSettings: () => ({ isDepositFlow: false }) },
  '@/hooks/useResolvedSwapStatus': { useResolvedSwapStatus: () => context.useSwapDataState().resolved },
  '@/lib/address/explorerUrl': { getExplorerUrl: () => 'explorer' },
  '@/lib/apiClients/layerSwapApiClient': api, '@/lib/ErrorHandler': { ErrorHandler: noop },
  'react-use-intercom': { useIntercom: () => ({ boot: noop, show: noop, update: noop }) },
  '../Failed': { default: () => null }, '@/lib/swapLifecycle': lifecycle,
  '../Presentation/ProcessingView': { ProcessingView: props => {
    presented = props
    return createElement('div', { id: 'processing' }, props.inputFailureMessage)
  } },
  '@/hooks/useLifecycleObservation': { useLifecycleObservation: event => { if (event) state.observations.push(event) } },
  '@/hooks/useClientLayoutEffect': { useClientLayoutEffect: React.useLayoutEffect },
}).default
function Recovery() {
  const { swapBasicData, swapDetails } = context.useSwapDataState()
  return createElement(Processing, { swapBasicData, swapDetails })
}
for (const legacy of [true, false]) {
  test(`Processing displays a ${legacy ? 'legacy' : 'new'} retained gasless hash during an authorization outage`, async () => {
    if (legacy) authorizations.setState({ authorizations: { A: {
      validBefore: 0, status: 'expired', transaction: { transaction_hash: '0xrestored', status: 'failed', confirmations: 99 },
    } } })
    else authorizations.getState().recordGaslessTransactionHash('A', '0xrestored')
    state.read = async () => { throw new Error('Authorization unavailable') }
    await render(createElement(Recovery))
    assert.equal(observed.resolved.phase, 'input_pending', 'historical status is not authoritative')
    assert.equal(presented.transactionHash, '0xrestored')
    assert.equal(presented.inputConfirmations, undefined, 'historical confirmations are not displayed as current')
  })
}

const providerImports = {
  react: React, '@/context/swap': context, '@/lib/apiClients/layerSwapApiClient': api,
  '@layerswap/wallet-core/errors': await import('@layerswap/wallet-core/errors'),
  '@layerswap/widget-types': await import('@layerswap/widget-types'),
  '@/context/settings': { useInitialSettings: () => ({}), useSettingsState: () => ({ networks: [], sourceRoutes: [] }) },
  '@/context/swapAccounts': { useSelectedAccount: () => account },
  '@/hooks/useWallet': { default: () => ({ wallets: [account] }) },
  '@/context/withdrawalContext': { useWalletWithdrawalState: () => ({ onWalletWithdrawalSuccess: () => { state.successes++ } }) },
  '@/hooks/useTransfer': { useTransfer: () => ({ executeTransfer: (...args) => state.executeTransfer(...args) }) },
  '@/context/callbackProvider': { useCallbacks: () => ({ onSwapLifecycle: event => state.events.push(event) }) },
  '@/lib/ErrorHandler': { ErrorHandler: error => state.errors.push(error) },
  '@/lib/swapLifecycle': lifecycle,
  '@/components/Pages/Swap/Withdraw/Wallet/Common/executeWalletOperation': { executeWalletOperation },
  '../executeProviderWithdrawal': { executeProviderWithdrawal, getProviderDepositActions },
  '@/components/utils/RoundDecimals': { truncateToDecimals },
}
const useHyperliquidWithdrawal = loadSource('components/Pages/Swap/Withdraw/WithdrawalProviders/Hyperliquid/useHyperliquidWithdrawal.ts', providerImports).useHyperliquidWithdrawal
const usePolymarketWithdrawal = loadSource('components/Pages/Swap/Withdraw/WithdrawalProviders/Polymarket/usePolymarketWithdrawal.ts', providerImports).usePolymarketWithdrawal
const passthrough = ({ children }) => children
const motion = await import('framer-motion')
const animation = await import('../dist/esm/components/Pages/Swap/Withdraw/Presentation/swapFlowAnimation.js')
const reducedMotion = { useHydratedReducedMotion: () => state.reducedMotion }
const transitions = loadSource('components/Pages/Swap/Withdraw/Presentation/WalletExecutionTransition.tsx', {
  react: React, 'framer-motion': motion, '@/hooks/useHydratedReducedMotion': reducedMotion,
  './swapFlowAnimation': animation,
})
const sections = loadSource('components/Pages/Swap/Withdraw/Presentation/Page2Sections.tsx', {
  react: React, 'framer-motion': motion, '@/hooks/useHydratedReducedMotion': reducedMotion,
  './swapFlowAnimation': animation, './WalletExecutionTransition': transitions,
  '../Processing/StepsComponent': { StepsPanelProvider: passthrough },
})
const walletMessages = loadSource('components/Pages/Swap/Withdraw/messages/Message.tsx', {
  react: React, 'framer-motion': motion, 'lucide-react': { ChevronDown: () => null },
  '@/components/shadcn/accordion': { Accordion: passthrough, AccordionContent: passthrough,
    AccordionItem: passthrough, AccordionTrigger: passthrough },
  '../../../../Icons/FailIcon': { default: () => null },
})
const transactionMessages = loadSource('components/Pages/Swap/Withdraw/messages/TransactionMessages.tsx', {
  react: React, '@layerswap/widget-types': await import('@layerswap/widget-types'),
  './Message': walletMessages, '@/lib/address/Address': { Address: class {} },
})
const actionMessages = loadSource('components/Pages/Swap/Withdraw/Presentation/ActionMessageView.tsx', {
  react: React, '@layerswap/widget-types': await import('@layerswap/widget-types'),
  '../Wallet/Common/isUserRejection': await import('@layerswap/wallet-core/errors'),
  '../messages/Message': walletMessages, '../messages/TransactionMessages': transactionMessages,
})
const retryView = loadSource('components/Pages/Swap/Withdraw/Presentation/RetryView.tsx', {
  '@/components/Buttons/submitButton': { default: ({ children, onClick, isDisabled }) =>
    createElement('button', { onClick, disabled: isDisabled }, children) },
})
const { useSwapRetry } = loadSource('hooks/useSwapRetry.ts', {
  react: React, '@/context/swap': context, '@/stores/swapTransactionStore': stores,
  '@/stores/gaslessPreferenceStore': await import('../dist/esm/stores/gaslessPreferenceStore.js'),
  '@/helpers/swapProgress': await import('../dist/esm/helpers/swapProgress.js'),
  './useGaslessAuthorization': failure,
  './useResolvedSwapStatus': { useResolvedSwapStatus: () => context.useSwapDataState().resolved },
  '@/lib/swapReconciliation': await import('../dist/esm/lib/swapReconciliation.js'),
  '@/context/swapAccounts': { useSelectedAccount: () => account },
  './useClientLayoutEffect': { useClientLayoutEffect: React.useLayoutEffect },
})
const SwapDetails = loadSource('components/Pages/Swap/Withdraw/SwapDetails.tsx', {
  react: React, '@/context/swap': context,
  '@/context/callbackProvider': { useCallbacks: () => ({ onSwapLifecycle: noop, onBackClick: noop }) },
  '@/context/swapAccounts': { useSelectedAccount: () => account },
  '@/hooks/useResolvedSwapStatus': { useResolvedSwapStatus: () => context.useSwapDataState().resolved },
  '@/hooks/useSwapRetry': { useSwapRetry },
  '@/hooks/useIsGaslessActive': { useIsGaslessActive: () => false },
  '@/helpers/swapFlow': { shouldShowCompactSwapQuote: () => false },
  './Presentation/Page2Sections': sections,
  './Presentation/Page2Contained': { Page2Contained: passthrough },
  '@/components/Widget/Index': { Widget: passthrough },
  './Summary': { default: () => null }, './SwapQuoteDetails': { SwapQuoteDetails: () => null },
  '@/components/Common/Sceletons': { SwapDetailsSceleton: () => null },
  '@/lib/swapLifecycle': lifecycle, './ManualWithdraw': { default: () => null },
  './Presentation/RetryView': retryView,
  './Presentation/ActionMessageView': actionMessages,
  './Processing': { default: ({ inputFailureMessage }) => {
    const { swapBasicData, swapDetails, quote, refuel } = context.useSwapDataState()
    return createElement(Processing, { swapBasicData, swapDetails, quote, refuel, inputFailureMessage })
  } },
  './Withdraw': { default: () => {
    const { swapBasicData, swapId } = context.useSwapDataState()
    useEffect(() => { state.mounts++; return () => { state.unmounts++ } }, [])
    if (commonWithdrawal) return createElement(SendTransactionButton, {
      swapData: swapBasicData, refuel: false, onSign: async () => 'signature',
      onClick: async () => '0xwallet',
    })
    withdrawal = withdrawalHook({ swapBasicData, swapId, refuel: false })
    return createElement('div', { id: 'withdrawal' }, withdrawal.error?.details)
  } },
}).default

const walletPath = 'components/Pages/Swap/Withdraw/Wallet/Common/'
const depositActions = await import('../dist/esm/helpers/depositActions.js')
const gaslessPreferences = await import('../dist/esm/stores/gaslessPreferenceStore.js')
const { executeGaslessAuthorization, completeGaslessSubmission, executeWalletTransfer } = loadSource(walletPath + 'depositExecution.ts', {
  '@layerswap/widget-types': await import('@layerswap/widget-types'),
  '@/lib/apiClients/layerSwapApiClient': api, '@/stores/swapTransactionStore': stores,
  '@/lib/address/explorerUrl': { getExplorerUrl: () => 'explorer' },
  '@/stores/gaslessPreferenceStore': gaslessPreferences,
  './isUserRejection': await import('@layerswap/wallet-core/errors'),
  '@/lib/ErrorHandler': { ErrorHandler: error => state.errors.push(error) },
  '@/lib/swapLifecycle': lifecycle,
  '@/lib/widgetTelemetry': { widgetTelemetry: { beginOperation: () => noop } },
  './executeWalletOperation': { executeWalletOperation },
  '@/helpers/gasless': gasless, '@/helpers/depositActions': depositActions,
})
const walletActionsView = loadSource('components/Pages/Swap/Withdraw/Presentation/WalletActionsView.tsx', {
  react: React, '@/components/Buttons/submitButton': { default: ({ children, onClick, isDisabled }) =>
    createElement('button', { onClick, disabled: isDisabled }, children) },
  '@/components/Icons/FailIcon': { default: () => null }, '@/components/Icons/InfoIcon': { default: () => null },
  '@/helpers/depositActions': depositActions, './DepositWorkflowView': { DepositWorkflowView: () => null },
  './WalletExecutionTransition': transitions,
  '@layerswap/ui-kit/components': { WalletIcon: () => null }, 'lucide-react': { Loader2: () => null },
  '../../Form/SecondaryComponents/validationError/constants': {},
  '../../Form/SecondaryComponents/validationError/ErrorDismissButton': { default: () => null },
  '../../Form/SecondaryComponents/validationError/ErrorDisplay': { ErrorDisplay: () => null },
  '../messages/Message': walletMessages,
  '../Wallet/Common/ensureSourceChain': sourceChain,
})
const { SendTransactionButton } = loadSource(walletPath + 'buttons.tsx', {
  react: React, swr: await import('swr'), '@/context/swap': context,
  '@/context/callbackProvider': { useCallbacks: () => ({ onSwapLifecycle: event => state.events.push(event) }) },
  '@/lib/swapLifecycle': lifecycle, '@/hooks/useClientLayoutEffect': { useClientLayoutEffect: React.useLayoutEffect },
  '@/hooks/useDepositActionPolling': { depositActionsKey: () => 'actions', useDepositActionPolling: () => ({
    data: state.snapshot.data.deposit_actions, refresh: async () => state.snapshot.data.deposit_actions,
    waitForTransition: () => state.transition.promise,
  }) },
  '@/hooks/useTransferBlocked': { useTransferBlocked: noop },
  '@/helpers/swapProgress': await import('../dist/esm/helpers/swapProgress.js'),
  '@/lib/swapReconciliation': { reconcileSwap, withSwapReconciliation: async (_, fn) => fn() },
  '@/helpers/gasless': gasless, '@/helpers/depositActions': depositActions,
  './isUserRejection': await import('@layerswap/wallet-core/errors'),
  './ensureSourceChain': sourceChain,
  '@/components/utils/numbers': { isDiffByPercent: () => false },
  '@/components/Wallet/WalletModal': { useConnectModal: () => ({}) },
  '@/context/depositSettings': { useDepositSettings: () => ({}) },
  '@/context/settings': providerImports['@/context/settings'],
  '@/context/swapAccounts': providerImports['@/context/swapAccounts'],
  '@/context/withdrawalContext': providerImports['@/context/withdrawalContext'],
  '@/hooks/useWallet': providerImports['@/hooks/useWallet'],
  '@/lib/apiClients/layerSwapApiClient': api,
  '@/lib/balances/useBalance': { useBalance: () => ({ balances: [] }) },
  '@/lib/ErrorHandler': { ErrorHandler: error => state.errors.push(error) },
  '@/lib/fees': { resolvePriceImpactValues: () => ({}) },
  '@/lib/gases/useSWRGas': { default: () => ({}) },
  '@/stores/gaslessPreferenceStore': gaslessPreferences,
  '@/stores/swapTransactionStore': stores,
  '@layerswap/utils': { sleep: async () => {} },
  '../../Presentation/WalletActionsView': { ButtonWrapper: () => null, ChangeNetworkMessage: () => null,
    ChangeNetworkView: () => null, ConnectWalletView: () => null,
    SendTransactionView: props => { sendView = props; return createElement('div', { id: 'wallet' }) } },
  './depositExecution': { ...depositActions, executeGaslessAuthorization, completeGaslessSubmission, executeWalletTransfer },
})

for (const prefersReducedMotion of [true, false]) {
test(`gasless publication preserves the real layout controller with reduced motion ${prefersReducedMotion}`, async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
  commonWithdrawal = true
  state.reducedMotion = prefersReducedMotion
  gaslessPreferences.useGaslessPreferenceStore.getState().setGaslessEnabled(true)
  state.snapshot.data.swap.source_token = { supports_gasless_deposit: true, contract: '0xtoken', gasless_standard: 'eip3009' }
  state.snapshot.data.deposit_actions[0].status = 'action_required'
  state.snapshot.data.deposit_actions[0].typed_data = { message: { validBefore: '9999999999' } }
  state.read = async () => { throw Object.assign(new Error('Not issued'), { response: { status: 404 } }) }
  state.transition = Promise.withResolvers()
  let pending
  try {
    await render(createElement(SwapDetails, { type: 'contained' }))
    await act(async () => { pending = sendView.handleClick() })
    assert.ok(signatures.getState().signatures.A)
    assert.equal(state.mounts, 1)
    const published = { status: 'published', transaction: { transaction_hash: '0xgasless', status: 'pending' } }
    state.read = async () => ({ data: published })
    await act(async () => t.mock.timers.tick(4000))
    assert.equal(observed.resolved.showWithdrawScreen, false)
    assert.ok(container.querySelector('#wallet'))
    assert.equal(state.mounts, 1, 'publication does not move the controller into a different keyed panel')
    assert.equal(state.unmounts, 0, 'execution is still active')
    await act(async () => { state.transition.resolve({ actions: state.snapshot.data.deposit_actions, authorization: published }); await pending })
    assert.equal(state.successes, 1)
    assert.equal(state.events.at(-1).step, 'gasless_authorization_submitted')
    assert.ok(container.querySelector('#processing'))
    assert.equal(observed.walletWithdrawalExecuting, false)
    assert.equal(authorizations.getState().authorizations.A.transaction.transaction_hash, '0xgasless')
    assert.equal(transactions.getState().pendingSubmissions.A, undefined, 'publication state is not persisted in the frontend')
  } finally {
    state.transition.resolve({ actions: [] })
    await pending
    gaslessPreferences.useGaslessPreferenceStore.getState().resetGaslessPreference()
  }
})
}

for (const [name, hook] of [['Hyperliquid', useHyperliquidWithdrawal], ['Polymarket', usePolymarketWithdrawal]]) {
  for (const outcome of ['success', 'refusal', 'unknown']) {
    test(`${name} controller survives submission through ${outcome} in the real parent screen`, async () => {
      withdrawalHook = hook
      state.snapshot.data.deposit_actions = [{ type: 'transfer', step: 'deposit', status: 'action_required',
        to_address: 'deposit', call_data: '0x', amount_in_base_units: '1000000' }]
      const transfer = Promise.withResolvers()
      let onSubmissionStateChange, pending
      state.executeTransfer = params => {
        onSubmissionStateChange = params.onSubmissionStateChange
        onSubmissionStateChange('submitting')
        return transfer.promise
      }
      try {
        await render(createElement(SwapDetails, { type: 'contained' }))
        await act(async () => { pending = withdrawal.handleWithdraw() })
        assert.equal(transactions.getState().pendingSubmissions.A, true)
        assert.equal(observed.resolved.showWithdrawScreen, false)
        assert.ok(container.querySelector('#withdrawal'), 'the active controller remains mounted')
        assert.equal(observed.walletWithdrawalExecuting, true)
        assert.equal(state.mounts, 1)
        assert.equal(state.unmounts, 0, 'the real layout preserves the provider controller until settlement')
        await act(async () => {
          if (outcome === 'success') transfer.resolve('')
          else {
            if (outcome === 'refusal') onSubmissionStateChange('not_submitted')
            transfer.reject(new Error('Provider refused withdrawal'))
          }
          await pending
        })
        assert.equal(observed.walletWithdrawalExecuting, false)
        if (outcome === 'success') {
          assert.equal(state.successes, 1)
          assert.deepEqual(state.events.map(event => event.step), ['wallet_prompt_opened', 'transaction_submitted'])
          assert.ok(container.querySelector('#processing'))
        } else {
          assert.equal(state.successes, 0)
          assert.equal(state.events.at(-1).step, 'wallet_action_failed')
          assert.equal(state.errors.length, 1)
          if (outcome === 'refusal') {
            assert.match(container.textContent, /Provider refused withdrawal/)
            assert.equal(transactions.getState().pendingSubmissions.A, undefined)
          } else {
            assert.equal(transactions.getState().pendingSubmissions.A, true)
            assert.ok(container.querySelector('#processing'))
          }
        }
      } finally {
        transfer.resolve('')
        await pending
      }
    })
  }
}

test('closing the active controller preserves uncertainty and reopens Processing', async () => {
  withdrawalHook = useHyperliquidWithdrawal
  state.snapshot.data.deposit_actions = [{ type: 'transfer', step: 'deposit', status: 'action_required',
    to_address: 'deposit', call_data: '0x', amount_in_base_units: '1000000' }]
  const transfer = Promise.withResolvers()
  state.executeTransfer = () => transfer.promise
  await render(createElement(SwapDetails, { type: 'contained' }))
  let pending
  await act(async () => { pending = withdrawal.handleWithdraw() })
  await render()
  assert.equal(observed.walletWithdrawalExecuting, false)
  await render(createElement(SwapDetails, { type: 'contained' }))
  assert.ok(container.querySelector('#processing'))
  await act(async () => { transfer.resolve(''); await pending })
  assert.equal(transactions.getState().pendingSubmissions.A, true)
  assert.equal(state.successes, 0)
})

const historyPages = { swaps: [], isLoading: false, isValidating: false, hasMore: false }
const { useSwapHistoryData } = loadSource('hooks/useSwapHistoryData.ts', {
  react: React, '@layerswap/widget-types': await import('@layerswap/widget-types'),
  '@/lib/apiClients/layerSwapApiClient': api, '@/stores/swapTransactionStore': stores,
  './useSwrSwaps': { useSwrSwaps: ({ statuses }) => ({ ...historyPages,
    swaps: statuses.includes('PendingDeposit') ? state.historySwaps : state.terminalHistorySwaps }) },
  './useExtendedSourceSkin': { useExtendedSourceSkin: () => React.useCallback(swap => swap, []) },
  '@/lib/address/Address': { Address: class { constructor(address) { this.normalized = address } } },
})
const StatusIcon = loadSource('components/Pages/SwapHistory/StatusIcons.tsx', {
  '@layerswap/widget-types': await import('@layerswap/widget-types'),
  '@/lib/apiClients/layerSwapApiClient': api,
  '@/hooks/useGaslessAuthorizationStatus': { useGaslessAuthorizationStatus }, '@/helpers/gasless': gasless,
  '@/hooks/useInputTransactionStatus': { useInputTransactionStatus }, '@/stores/swapTransactionStore': stores,
  '@/components/Icons/CircleCheckIcon': { default: () => null },
}).default
const History = loadSource('components/Pages/SwapHistory/History.tsx', {
  react: React, clsx: await import('clsx'),
  'lucide-react': { ChevronUp: () => null, Plug: () => null, Plus: () => null, RefreshCw: () => null },
  './HistorySummary': { default: ({ swapResponse }) => createElement('div', { 'data-swap': swapResponse.swap.id },
    createElement(StatusIcon, { swap: swapResponse.swap })) },
  '@/hooks/useWallet': { default: () => ({ wallets: [account] }) },
  './Snippet': { default: () => null, HistoryItemSceleton: () => null },
  '@/components/utils/groupBy': await import('../dist/esm/components/utils/groupBy.js'),
  '@/components/Buttons/connectButton': { default: passthrough },
  '@/lib/virtual': { useVirtualizer: ({ count }) => ({
    getVirtualItems: () => Array.from({ length: count }, (_, index) => ({ index, key: index, start: index * 35 })),
    getTotalSize: () => count * 35, measureElement: noop,
  }) },
  './SwapDetailsComponent': { default: () => null },
  '@/context/settings': { useSettingsState: () => ({ networks: [] }) },
  '@/components/shadcn/accordion': { Accordion: passthrough, AccordionItem: passthrough,
    AccordionTrigger: passthrough, AccordionContent: () => null },
  '@/hooks/useSwapHistoryData': { useSwapHistoryData }, '@/context/swap': context,
  '@/stores/swapTransactionStore': stores,
  '@/hooks/useHistoryFilters': { useHistoryFilters: () => ({ clearFilters: noop }) },
  '@/hooks/useSwapByTransactionHash': { useSwapByTransactionHash: () => ({ isActive: false }) },
  './Filters': { default: () => null },
  './Filters/NoMatches': { default: () => null }, './Filters/SearchResult': { default: () => null },
  '@/lib/AppSettings': { default: {} },
  '@/lib/historyWalletAddresses': { getHistoryWalletAddresses: () => [{ address: 'source' }], MAX_HISTORY_ADDRESSES: 10 },
}).default

function HistoryCache() {
  state.mutateHistory = swr.useSWRConfig().mutate
  return null
}
const renderHistory = () => act(async () => root.render(createElement(SWRConfig, { value: config },
  createElement(React.Fragment, null, createElement(HistoryCache), createElement(History)))))

for (const migrated of [false, true]) {
  test(`history ignores ${migrated ? 'migrated' : 'new'} local submission markers and follows backend rows`, async () => {
    state.snapshot.data.swap = { ...state.snapshot.data.swap, source_address: 'source', created_date: '2026-10-08T00:00:00Z' }
    state.read = async () => { throw Object.assign(new Error('Not issued'), { response: { status: 404 } }) }
    if (migrated) {
      localStorage.setItem('swapTransactions', JSON.stringify({ version: 0, state: {
        swapTransactions: { A: { hash: '', status: 'pending', timestamp: 1 } },
      } }))
      await transactions.persist.rehydrate()
    } else transactions.getState().setSwapTransaction('A', 'pending', '')
    await renderHistory()
    assert.deepEqual(state.swapReads, [], 'local storage does not reconstruct missing backend history entries')
    assert.deepEqual(transactions.getState().swapTransactions, {}, 'there is no fabricated transaction')
    assert.equal(container.querySelector('[data-swap="A"]'), null)
    state.historySwaps = [state.snapshot.data]
    await renderHistory()
    assert.ok(container.querySelector('[data-swap="A"]'), 'an unfunded backend row remains visible without a local activity filter')
    assert.match(container.textContent, /Incomplete/)
    assert.doesNotMatch(container.textContent, /In Progress/)
    await act(async () => transactions.getState().clearPendingSubmission('A'))
    assert.ok(container.querySelector('[data-swap="A"]'), 'clearing a local marker cannot hide a backend row')
  })
}

test('a recovery marker does not override a terminal backend history status', async () => {
  state.snapshot.data.swap = { ...state.snapshot.data.swap, source_address: 'source',
    created_date: '2026-10-08T00:00:00Z', status: 'expired' }
  transactions.getState().markSubmissionPending('A')
  state.terminalHistorySwaps = [state.snapshot.data]
  await renderHistory()
  assert.ok(container.querySelector('[data-swap="A"]'))
  assert.match(container.textContent, /Expired/)
  assert.doesNotMatch(container.textContent, /In Progress/)
})

for (const status of ['published', 'completed']) {
  for (const hash of [undefined, '0xgasless']) {
    test(`${status} gasless submission ${hash ? 'with a hash' : 'without a hash'} recovers from backend status without a local publication marker`, async () => {
      state.snapshot.data.swap = { ...state.snapshot.data.swap, source_address: 'source', created_date: '2026-10-08T00:00:00Z' }
      signatures.getState().setDepositSignature('A', 99999999)
      const submission = { status, ...(hash ? { transaction: { transaction_hash: hash } } : {}) }
      completeGaslessSubmission({
        swapData: state.snapshot.data.swap, swapBasicData: state.snapshot.data.swap, selectedWallet: account,
        onLifecycle: event => {
          assert.equal(transactions.getState().pendingSubmissions.A, undefined, 'publication state is not persisted')
          state.events.push(event)
        },
        onSuccess: () => {
          assert.equal(transactions.getState().pendingSubmissions.A, undefined)
          state.successes++
        },
      }, submission)
      assert.equal(state.successes, 1)
      assert.equal(signatures.getState().signatures.A, undefined)
      assert.deepEqual(transactions.getState().swapTransactions, {}, 'gasless publication does not invent a wallet transaction')
      assert.equal(authorizations.getState().authorizations.A?.transaction?.transaction_hash, hash)

      state.read = async () => ({ data: submission })
      state.historySwaps = [state.snapshot.data]
      await renderHistory()
      assert.deepEqual(state.swapReads, [])
      assert.ok(container.querySelector('[data-swap="A"]'), 'history retains publication before backend input detection')
      assert.match(container.textContent, /In Progress/)

      const saved = ['swapTransactions', 'gaslessAuthorizations', 'depositSignatures'].map(key => [key, localStorage.getItem(key)])
      await act(async () => root.unmount())
      root = createRoot(container)
      for (const store of [transactions, authorizations, signatures]) store.setState(store.getInitialState(), true)
      for (const [key, value] of saved) localStorage.setItem(key, value)
      for (const store of [transactions, authorizations, signatures]) await store.persist.rehydrate()
      await render(createElement(SwapDetails, { type: 'contained' }))
      assert.equal(observed.resolved.phase, 'input_pending')
      assert.equal(transactions.getState().pendingSubmissions.A, undefined)
      assert.ok(container.querySelector('#processing'), 'a reload recovers publication from the backend')
      assert.equal(state.mounts, 0)
      if (hash) assert.equal(presented.transactionHash, hash)

      await act(async () => root.unmount())
      root = createRoot(container)
      state.read = async () => { throw new Error('Authorization unavailable') }
      state.receiptRead = async () => { throw new Error('Receipt unavailable') }
      await render(createElement(SwapDetails, { type: 'contained' }))
      assert.equal(observed.resolved.phase, 'checking_transfer_status', 'an outage is unresolved rather than locally pending or failed')
      assert.equal(observed.resolved.generalStatus.title, 'Checking transfer status')
      assert.ok(container.querySelector('#processing'))
      assert.equal(state.mounts, 0, 'unresolved checks cannot reopen wallet submission')
      assert.equal(container.querySelector('button'), null, 'unresolved checks cannot offer retry')
    })
  }
}

test('background polling resolves hashless publication from backend status without persisting it', async () => {
  signatures.getState().setDepositSignature('A', 99999999)
  const publication = Promise.withResolvers()
  state.read = () => publication.promise
  await render()
  assert.ok(signatures.getState().signatures.A)
  await act(async () => publication.resolve({ data: { status: 'published' } }))
  assert.equal(transactions.getState().pendingSubmissions.A, undefined)
  assert.equal(signatures.getState().signatures.A, undefined)
  assert.equal(observed.resolved.phase, 'input_pending')
  assert.equal(state.mounts, 0, 'there is no active wallet controller to persist the publication')
})

test('wallet success and controller handoff finish while optional catchup is still pending', async () => {
  commonWithdrawal = true
  gaslessPreferences.useGaslessPreferenceStore.getState().setGaslessEnabled(false)
  state.snapshot.data.swap.metadata = {}
  state.snapshot.data.deposit_actions = [{ type: 'transfer', step: 'deposit', status: 'action_required',
    to_address: 'deposit', amount: 1, amount_in_base_units: '1000000' }]
  const catchup = Promise.withResolvers()
  state.catchup = () => catchup.promise
  let pending, settled = false
  try {
    await render(createElement(SwapDetails, { type: 'contained' }))
    await act(async () => {
      pending = sendView.handleClick()
      pending.then(() => { settled = true })
    })
    assert.equal(transactions.getState().swapTransactions.A.hash, '0xwallet')
    assert.equal(state.successes, 1, 'a slow auxiliary endpoint does not suppress wallet success')
    assert.equal(settled, true, 'the execution promise no longer waits for catchup')
    assert.equal(observed.walletWithdrawalExecuting, false)
    assert.ok(container.querySelector('#processing'))
    await act(async () => catchup.reject(new Error('Catchup unavailable')))
    assert.equal(state.errors.length, 1)
    assert.equal(state.errors[0].type, 'SwapCatchupError', 'background failure is still reported')
    assert.equal(state.successes, 1)
    assert.equal(transactions.getState().swapTransactions.A.hash, '0xwallet')
  } finally {
    catchup.resolve()
    await pending
    gaslessPreferences.useGaslessPreferenceStore.getState().resetGaslessPreference()
  }
})

test('Processing shows retry check failures through ActionMessageView and clears them on a new check', async () => {
  state.read = async () => ({ data: { status: 'expired' } })
  signatures.getState().setDepositSignature('A', 99999999)
  transactions.getState().markSubmissionPending('A')
  const signature = signatures.getState().signatures.A
  const preference = gaslessPreferences.useGaslessPreferenceStore.getState().gaslessEnabled
  await render(createElement(SwapDetails, { type: 'contained' }))
  const originalFailure = presented.inputFailureMessage
  assert.ok(originalFailure)
  const retryButton = () => Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Try again')
  assert.ok(retryButton())
  const check = Promise.withResolvers()
  state.reconcile = () => check.promise
  await act(async () => retryButton().click())
  assert.equal(retryButton().disabled, true)
  await act(async () => check.reject(new Error('Status unavailable')))
  const alert = container.querySelector('[role="alert"]')
  assert.match(alert.textContent, /Something went wrong/)
  assert.match(alert.textContent, /Status unavailable/)
  assert.equal(retryButton().disabled, false)
  assert.equal(observed.swapId, 'A')
  assert.equal(transactions.getState().pendingSubmissions.A, true)
  assert.equal(signatures.getState().signatures.A, signature, 'failed checks preserve recovery evidence')
  assert.equal(gaslessPreferences.useGaslessPreferenceStore.getState().gaslessEnabled, preference)
  assert.equal(presented.inputFailureMessage, originalFailure, 'the backend failure remains visible alongside the check error')
  assert.match(container.textContent, new RegExp(originalFailure))

  const secondCheck = Promise.withResolvers()
  state.reconcile = () => secondCheck.promise
  await act(async () => retryButton().click())
  assert.equal(container.querySelector('[role="alert"]'), null, 'starting another check clears the previous check error')
  assert.equal(retryButton().disabled, true)
  await act(async () => secondCheck.reject(new Error('Still unavailable')))
  assert.match(container.querySelector('[role="alert"]').textContent, /Still unavailable/)
  assert.doesNotMatch(container.textContent, /Status unavailable/)
  assert.equal(observed.swapId, 'A')
  assert.equal(transactions.getState().pendingSubmissions.A, true)
})

test('backend acceptance overrides an older actionable sign snapshot and legacy markers', async () => {
  state.snapshot.data.deposit_actions[0].status = 'action_required'
  signatures.getState().setDepositSignature('A', 1)
  transactions.getState().markSubmissionPending('A')
  await render(createElement(SwapDetails, { type: 'contained' }))
  assert.equal(observed.authorizationResponse.status, 'initiated')
  assert.equal(observed.resolved.phase, 'input_pending')
  assert.equal(observed.resolved.showWithdrawScreen, false)
  assert.ok(container.querySelector('#processing'))
  assert.equal(transactions.getState().pendingSubmissions.A, true, 'the legacy record exists but establishes no phase')
  assert.equal(state.receiptCalls.length, 0)
})

for (const status of ['pending', 'completed']) {
  for (const evidence of ['hash', 'hashless_marker']) {
    test(`backend publication ${status} retains progress while the ${evidence} receipt is unavailable`, async () => {
      state.snapshot.data.deposit_actions = [
        { step: 'sign', type: 'sign', signing_standard: 'permit2_witness', status: 'completed' },
        { step: 'publish', type: 'transfer', status },
      ]
      if (evidence === 'hash') transactions.getState().setSwapTransaction('A', 'failed', '0xwallet')
      else transactions.getState().markSubmissionPending('A')
      state.receiptRead = async () => { throw new Error('Receipt unavailable') }
      await render(createElement(SwapDetails, { type: 'contained' }))
      assert.equal(observed.inputTransactionStatus, undefined)
      assert.equal(observed.authorizationResponse, undefined, 'self-paid swaps need no paymaster observation')
      assert.equal(observed.resolved.phase, 'input_pending', 'publication comes from current backend actions')
      assert.equal(observed.resolved.failureReason, undefined)
      assert.equal(observed.resolved.showWithdrawScreen, false)
      assert.ok(container.querySelector('#processing'))
      assert.equal(container.querySelector('button'), null, 'receipt outages cannot reopen submission or retry')
      assert.equal((await reconcileSwap('A', 'source', {}, new Client())).canRestart, false)
    })
  }
}

test('a self-paid wallet hash stays unresolved until the backend observes publication', async () => {
  state.snapshot.data.deposit_actions = [
    { step: 'sign', type: 'sign', signing_standard: 'permit2_witness', status: 'completed' },
    { step: 'publish', type: 'transfer', status: 'action_required' },
  ]
  transactions.getState().setSwapTransaction('A', 'completed', '0xwallet')
  const receipt = Promise.withResolvers()
  state.receiptRead = () => receipt.promise
  await render(createElement(SwapDetails, { type: 'contained' }))
  assert.equal(observed.resolved.phase, 'checking_transfer_status')
  assert.equal(observed.resolved.failureReason, undefined)
  assert.equal(container.querySelector('button'), null)
  await act(async () => receipt.resolve({ data: { status: 'pending' } }))
  assert.equal(observed.resolved.phase, 'input_pending')
  assert.equal(container.querySelector('button'), null)
})

test('backend gasless publication remains authoritative with an empty workflow response', async () => {
  state.snapshot.data.deposit_actions = []
  state.read = async () => ({ data: { status: 'published' } })
  await render(createElement(SwapDetails, { type: 'contained' }))
  assert.equal(observed.resolved.phase, 'input_pending')
  assert.equal(observed.resolved.showWithdrawScreen, false)
  assert.equal(container.querySelector('button'), null)
})

test('every retained hash needs a backend receipt before the screen can leave checking or offer retry', async () => {
  transactions.getState().setSwapTransaction('A', 'failed', '0xwallet')
  authorizations.getState().recordGaslessTransactionHash('A', '0xgasless')
  state.read = async () => ({ data: { status: 'expired' } })
  const walletReceipt = Promise.withResolvers()
  const gaslessReceipt = Promise.withResolvers()
  state.receiptRead = (_, hash) => hash === '0xwallet' ? walletReceipt.promise : gaslessReceipt.promise
  await render(createElement(React.Fragment, null, createElement(HistoryCache), createElement(SwapDetails, { type: 'contained' })))
  assert.equal(observed.resolved.phase, 'checking_transfer_status')
  assert.equal(observed.resolved.swapInputTxStatus, undefined)
  assert.equal(observed.resolved.failureReason, undefined)
  assert.equal(state.observations.length, 0, 'unresolved checks do not emit a pending or failed lifecycle observation')
  assert.equal(container.querySelector('button'), null)
  assert.deepEqual(state.receiptCalls.map(([, hash]) => hash).sort(), ['0xgasless', '0xwallet'])
  await act(async () => {
    walletReceipt.resolve({ data: { status: 'failed' } })
    gaslessReceipt.resolve({ data: { status: 'pending' } })
  })
  assert.equal(observed.resolved.phase, 'input_pending', 'the live backend receipt overrides an expired authorization and stored failure')
  assert.equal(container.querySelector('button'), null)
  state.receiptRead = async () => ({ data: { status: 'failed' } })
  await act(async () => state.mutateHistory(['BASE_MAINNET', '0xgasless', '0xwallet']))
  assert.equal(observed.resolved.phase, 'failed')
  assert.equal(observed.resolved.failureReason, 'gasless_deposit_failed')
  assert.ok(Array.from(container.querySelectorAll('button')).some(button => button.textContent === 'Try again'),
    'only failure of every backend receipt makes retry available')
})

test('history shows an unavailable authorization as unresolved and discovers publication from the backend', async () => {
  state.snapshot.data.swap = { ...state.snapshot.data.swap, created_date: '2026-10-08T00:00:00Z' }
  state.historySwaps = [state.snapshot.data]
  transactions.getState().markSubmissionPending('A')
  transactions.getState().setSwapTransaction('A', 'pending', '0xlocal')
  state.read = async () => { throw new Error('Authorization unavailable') }
  state.receiptRead = async () => { throw new Error('Receipt unavailable') }
  await renderHistory()
  assert.ok(container.querySelector('[data-swap="A"]'))
  assert.match(container.textContent, /Checking transfer status/)
  assert.doesNotMatch(container.textContent, /In Progress/)
  state.read = async () => ({ data: { status: 'published' } })
  await act(async () => state.mutateHistory(authorizationKey('A', 7)))
  assert.match(container.textContent, /In Progress/)
  assert.deepEqual(state.swapReads, [], 'the row and its publication are read from backend endpoints')
})

const authorization404 = () => { throw Object.assign(new Error('Not issued'), { response: { status: 404 } }) }

test('reopening an unsigned gasless swap keeps signing controls available after the expected 404', async () => {
  commonWithdrawal = true
  state.snapshot.data.deposit_actions[0].status = 'action_required'
  state.read = authorization404
  await render(createElement(SwapDetails, { type: 'contained' }))
  assert.equal(observed.resolved.phase, 'awaiting_user_deposit')
  assert.equal(observed.resolved.showWithdrawScreen, true)
  assert.ok(container.querySelector('#wallet'))
  assert.equal(sendView.statusChecking, false)
  assert.deepEqual(transactions.getState().pendingSubmissions, {})
  assert.deepEqual(signatures.getState().signatures, {})
  assert.deepEqual(authorizations.getState().authorizations, {})
})

for (const evidence of ['signature', 'authorization', 'uncertain_submission', 'backend_sign_pending', 'missing_actions']) {
  test(`an authorization 404 remains checking with ${evidence}`, async () => {
    state.snapshot.data.deposit_actions[0].status = 'action_required'
    state.read = authorization404
    if (evidence === 'signature') signatures.getState().setDepositSignature('A', 1)
    if (evidence === 'authorization') authorizations.getState().setGaslessAuthorization('A', 1)
    if (evidence === 'uncertain_submission') transactions.getState().markSubmissionPending('A')
    if (evidence === 'backend_sign_pending') state.snapshot.data.deposit_actions[0].status = 'pending'
    if (evidence === 'missing_actions') state.snapshot.data.deposit_actions = []
    await render(createElement(SwapDetails, { type: 'contained' }))
    assert.equal(observed.resolved.phase, 'checking_transfer_status')
    assert.equal(observed.resolved.showWithdrawScreen, false)
    assert.equal(container.querySelector('#wallet'), null)
    assert.equal(container.querySelector('button'), null)
  })
}

test('a pre-sign 404 permits the real critical confirmation controls to continue', async () => {
  state.snapshot.data.deposit_actions[0].status = 'action_required'
  state.read = authorization404
  let continues = 0
  function Confirmation() {
    const { resolved } = context.useSwapDataState()
    return createElement(walletActionsView.SendTransactionView, {
      showCriticalMarketPriceImpactButtons: true,
      statusChecking: resolved.phase === 'checking_transfer_status',
      handleCriticalContinue: () => { continues++ },
    })
  }
  await render(createElement(Confirmation))
  assert.equal(observed.resolved.phase, 'awaiting_user_deposit')
  const button = Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Continue anyway')
  assert.ok(button)
  assert.equal(button.disabled, false)
  await act(async () => button.click())
  assert.equal(continues, 1)
})

test('a backend authorization accepted during a retry check preserves the original attempt', async () => {
  state.read = async () => ({ data: { status: 'expired' } })
  await render(createElement(SwapDetails, { type: 'contained' }))
  const retry = Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Try again')
  assert.ok(retry)
  assert.deepEqual(signatures.getState().signatures, {})
  assert.deepEqual(authorizations.getState().authorizations, {})
  state.read = async () => ({ data: { status: 'initiated' } })
  state.snapshot.data.deposit_actions[0].status = 'action_required'
  const preference = gaslessPreferences.useGaslessPreferenceStore.getState().gaslessEnabled
  await act(async () => retry.click())
  assert.equal(observed.swapId, 'A')
  assert.equal(observed.resolved.phase, 'input_pending')
  assert.equal(gaslessPreferences.useGaslessPreferenceStore.getState().gaslessEnabled, preference)
  assert.equal(state.successes, 0)
  assert.deepEqual(state.receiptCalls, [])
})

for (const status of ['pending', 'completed', 'failed', 'unavailable']) {
  test(`self-paid history follows the ${status} backend receipt instead of a stored status`, async () => {
    state.snapshot.data.swap.created_date = '2026-10-08T00:00:00Z'
    state.snapshot.data.deposit_actions = [{ type: 'transfer', step: 'deposit', status: 'action_required' }]
    state.historySwaps = [state.snapshot.data]
    state.read = authorization404
    transactions.getState().setSwapTransaction('A', status === 'failed' ? 'pending' : 'failed', '0xsource')
    if (status === 'unavailable') state.receiptRead = async () => { throw new Error('Receipt unavailable') }
    else state.receiptStatus = status
    await renderHistory()
    const expected = status === 'unavailable' ? 'Checking transfer status' : status === 'failed' ? 'Failed' : 'In Progress'
    assert.match(container.querySelector('[data-swap="A"]').textContent, new RegExp(expected))
    assert.deepEqual(state.receiptCalls, [['BASE_MAINNET', '0xsource']])
    assert.deepEqual(state.swapReads, [], 'lookup metadata cannot discover extra history rows')
  })
}

test('history checks every known receipt and shares observations with the active swap', async () => {
  state.snapshot.data.swap.created_date = '2026-10-08T00:00:00Z'
  state.historySwaps = [state.snapshot.data]
  state.read = authorization404
  transactions.getState().setSwapTransaction('A', 'failed', '0xwallet')
  authorizations.getState().recordGaslessTransactionHash('A', '0xgasless')
  state.receiptRead = async (_, hash) => ({ data: { status: hash === '0xwallet' ? 'failed' : 'pending' } })
  await render(createElement(React.Fragment, null, createElement(HistoryCache), createElement(History)))
  assert.equal(observed.resolved.phase, 'input_pending')
  assert.match(container.querySelector('[data-swap="A"]').textContent, /In Progress/)
  assert.deepEqual(state.receiptCalls.map(([, hash]) => hash).sort(), ['0xgasless', '0xwallet'], 'shared SWR keys deduplicate the two readers')
  state.receiptRead = async () => ({ data: { status: 'failed' } })
  await act(async () => state.mutateHistory(['BASE_MAINNET', '0xgasless', '0xwallet']))
  assert.match(container.querySelector('[data-swap="A"]').textContent, /Failed/)
})

test('history keeps polling after an initial authorization 404 and discovers publication without focus or mutation', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
  t.mock.method(Math, 'random', () => 0)
  state.snapshot.data.swap.created_date = '2026-10-08T00:00:00Z'
  state.historySwaps = [state.snapshot.data]
  state.read = authorization404
  await renderHistory()
  assert.match(container.querySelector('[data-swap="A"]').textContent, /Incomplete/)
  assert.equal(state.authorizationReads, 1)
  state.read = async () => ({ data: { status: 'published' } })
  for (let i = 0; i < 4; i++) await act(async () => t.mock.timers.tick(4000))
  assert.ok(state.authorizationReads > 1)
  assert.match(container.querySelector('[data-swap="A"]').textContent, /In Progress/)
})
