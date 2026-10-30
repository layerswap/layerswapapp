import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import React, { act, createElement, StrictMode } from 'react'
import { JSDOM } from 'jsdom'
import useSWR, { SWRConfig } from 'swr'
import { loadSource } from './helpers/source.mjs'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const previous = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) {
  Object.defineProperty(globalThis, key, { configurable: true, value, writable: true })
}
const { createRoot } = await import('react-dom/client')
const state = {}
const events = []
const callbacks = { useCallbacks: () => ({ onSwapLifecycle: event => events.push(event) }), useOptionalCallbacks: () => ({}) }
const layout = { useClientLayoutEffect: React.useLayoutEffect }
const { useTransferBlocked } = loadSource('hooks/useTransferBlocked.ts', {
  react: React, '@/hooks/useClientLayoutEffect': layout, '@/context/callbackProvider': callbacks,
})
const { useLifecycleObservation } = loadSource('hooks/useLifecycleObservation.ts', {
  react: React, '@/hooks/useClientLayoutEffect': layout, '@/context/callbackProvider': callbacks,
  '@layerswap/widget-types': await import('@layerswap/widget-types'),
})
const button = ({ children, onClick, isSubmitting }) => createElement('button', { onClick, disabled: isSubmitting }, children)
const empty = () => null
const { useManualWithdrawController } = loadSource('components/Pages/Swap/Withdraw/ManualWithdraw.tsx', {
  react: React,
  './TransferBlock': loadSource('components/Pages/Swap/Withdraw/TransferBlock.tsx', {
    '@/context/callbackProvider': callbacks,
    '@/context/swap': { useSwapDataState: () => ({ swapBasicData, ...state }) },
    '@/hooks/useTransferBlocked': { useTransferBlocked },
    '@/lib/swapLifecycle': { lifecycleContextFromSwap: (_, swap) => ({ swapId: swap?.id }) },
  }),
  '@/lib/depositAddressError': loadSource('lib/depositAddressError.ts'),
  '../Form/DepositAddressForm/DepositAddressRecoveryView': {
    DepositAddressRecoveryView: ({ message, isRetrying, onRetry }) => createElement('div', null,
      createElement('p', null, message), createElement(button, { onClick: onRetry, isSubmitting: isRetrying }, 'Retry')),
  },
  './Presentation/ManualSourceSelectorView': { ManualSourceSelectorView: ({ onSelect }) => { state.selectSource = onSelect; return createElement('span', null, 'Source selector') } },
  './Presentation/DepositQRCodeView': { DepositQRCodeView: empty },
  './Presentation/ManualDepositButtonView': loadSource('components/Pages/Swap/Withdraw/Presentation/ManualDepositButtonView.tsx', { '@/components/Buttons/submitButton': { default: button } }),
  '@/components/Input/Address/AddressPicker/AddressWithIcon': { ExtendedAddress: empty },
  '@/components/Widget/Index': { Widget: {} },
  '@/context/asyncModal': { useAsyncModal: () => ({}) },
  '@/context/settings': { useInitialSettings: () => ({}) },
  '@/context/swap': { useSwapDataState: () => state, useSwapDataUpdate: () => ({ mutateDepositActions: async () => { state.retries++; if (state.mutate) return state.mutate(); await state.refresh?.() } }) },
  '@/helpers/depositActions': loadSource('helpers/depositActions.ts'),
  '@/hooks/useExchangeNetworks': { default: () => ({}) },
  '@/hooks/useWallet': { default: () => ({ wallets: [] }) },
  '@/lib/address/Address': { Address: { isValid: () => false } },
  '@/stores/addressBookStore': { useAddressName: () => undefined },
  '@layerswap/ui-kit': { useCopyClipboard: () => [false, () => { state.copies++ }] },
  '@layerswap/ui-kit/components': { CopyButton: empty },
  '../Form/FeeDetails': { default: empty },
  './Presentation/ManualInstructionsView': { ManualInstructionsView: ({ depositAddress, sourceSelector }) => createElement('section', null, 'Amount and quote', sourceSelector, depositAddress || 'Loading address') },
  './QuoteUpdate': { handleLimitsUpdate: () => { throw new Error('Declined network change') } },
  '@/context/callbackProvider': callbacks,
  '@/lib/swapLifecycle': { lifecycleContextFromSwap: (_, swap) => ({ swapId: swap.id }) },
  '@/hooks/useLifecycleObservation': { useLifecycleObservation },
})
let root, container
const swapBasicData = { source_network: { name: 'source' }, destination_network: { name: 'destination' }, source_token: { symbol: 'ETH' }, destination_token: { symbol: 'ETH' } }
function View() {
  const request = useSWR(state.realSWR ? 'deposit-actions' : null, () => state.fetchActions(), { revalidateOnFocus: false, shouldRetryOnError: false })
  if (state.realSWR) {
    state.actions = request.data
    state.depositActionsError = request.error?.message
    state.depositActionsValidating = request.isValidating
    state.mutate = request.mutate
  }
  const model = useManualWithdrawController({ swapBasicData, depositActions: state.actions }, state.active)
  state.retryAction = model.footer?.props?.children?.props?.onRetry
  return createElement(React.Fragment, null, model.controls, state.active ? model.footer : null)
}
const render = () => act(async () => {
  root.render(createElement(StrictMode, null, createElement(SWRConfig, { value: { provider: () => new Map() } }, createElement(View))))
})
beforeEach(() => {
  Object.assign(state, { swapDetails: { id: 'manual-swap' }, actions: undefined, depositActionsError: undefined, active: true, retries: 0, copies: 0, refresh: undefined, mutate: undefined, realSWR: false, depositActionsValidating: false })
  events.length = 0
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
})
afterEach(async () => { await act(() => root.unmount()); container.remove() })
after(() => {
  dom.window.close()
  for (const key of ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT']) {
    if (previous[key]) Object.defineProperty(globalThis, key, previous[key]); else delete globalThis[key]
  }
})
test('loading does not report a block or await a deposit and disables copying', async () => {
  await render()
  assert.deepEqual(events, [])
  assert.equal(container.querySelector('button').disabled, true)
})
for (const error of [false, true]) {
  test(`settled missing address reports once and retries to usable instructions (error=${error})`, async () => {
    state.actions = error ? undefined : []
    state.depositActionsError = error ? 'API unavailable' : undefined
    await render(); await render()
    assert.deepEqual(events.map(event => event.reasonCode), ['deposit_actions_unavailable'])
    assert.match(container.textContent, /No deposit address|API unavailable/)
    assert.match(container.textContent, /Amount and quoteSource selector/)
    assert.equal(events[0].stage, 'input_transfer')
    state.refresh = () => { state.actions = [{ type: 'manual_transfer', to_address: 'usable-address' }]; state.depositActionsError = undefined }
    await act(async () => container.querySelector('button').click())
    await render()
    assert.equal(state.retries, 1)
    assert.match(container.textContent, /usable-address/)
    assert.deepEqual(events.map(event => event.step), ['transfer_blocked', 'awaiting_user_deposit'])
    await render()
    assert.equal(events.length, 2)
  })
}
test('unrendered manual controls cannot report a block', async () => {
  state.actions = []; state.active = false
  await render()
  assert.deepEqual(events, [])
})

test('a retry retaining the shared error does not repeat the mounted block', async () => {
  state.actions = []
  state.refresh = () => { state.depositActionsError = 'Still unavailable' }
  await render()
  await act(async () => container.querySelector('button').click())
  await render()
  assert.equal(state.retries, 1)
  assert.equal(container.querySelector('button').disabled, false)
  assert.deepEqual(events.map(event => event.reasonCode), ['deposit_actions_unavailable'])
})

test('cached usable instructions remain available after a refresh error', async () => {
  state.actions = [{ type: 'manual_transfer', to_address: 'cached-address' }]
  state.depositActionsError = 'Refresh failed'
  await render()
  assert.match(container.textContent, /cached-address/)
  assert.equal(container.querySelector('button').disabled, false)
  assert.deepEqual(events.map(event => event.step), ['awaiting_user_deposit'])
})


test('real SWR failure, overlapping retry invocations, and recovery preserve the body', async () => {
  state.realSWR = true
  state.fetchActions = async () => { throw new Error('Read failed') }
  await render()
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) })
  assert.deepEqual(events.map(event => event.reasonCode), ['deposit_actions_unavailable'])
  assert.match(container.textContent, /Amount and quoteSource selector/)
  let finish
  let calls = 0
  state.fetchActions = () => { calls++; return new Promise(resolve => { finish = resolve }) }
  const retry = state.retryAction
  let firstRetry
  await act(async () => {
    firstRetry = retry()
    await retry()
  })
  assert.equal(state.retries, 1)
  assert.equal(calls, 1)
  assert.equal(container.querySelector('button').disabled, true)
  await act(async () => {
    finish([{ type: 'manual_transfer', to_address: 'swr-address' }])
    await firstRetry
  })
  assert.match(container.textContent, /swr-address/)
  assert.deepEqual(events.map(event => event.step), ['transfer_blocked', 'awaiting_user_deposit'])
})

test('a declined source change does not re-emit awaiting-user-deposit', async () => {
  state.actions = [{ type: 'manual_transfer', to_address: 'original-address' }]
  await render()
  const originalError = console.error
  console.error = () => {}
  try {
    await act(async () => state.selectSource(swapBasicData.source_network, swapBasicData.source_token))
  } finally {
    console.error = originalError
  }
  assert.deepEqual(events.map(event => event.step), ['awaiting_user_deposit'])
})
