import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import React, { act, createElement, StrictMode } from 'react'
import { JSDOM } from 'jsdom'
import { loadSource } from './helpers/source.mjs'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const previous = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) {
  Object.defineProperty(globalThis, key, { configurable: true, value, writable: true })
}
const { createRoot } = await import('react-dom/client')
const state = {}
const events = []
const callbacks = { useCallbacks: () => ({ onSwapLifecycle: event => events.push(event) }) }
const layout = { useClientLayoutEffect: React.useLayoutEffect }
const { useTransferBlocked } = loadSource('hooks/useTransferBlocked.ts', {
  react: React, '@/hooks/useClientLayoutEffect': layout, '@/context/callbackProvider': callbacks,
})
const { useLifecycleObservation } = loadSource('hooks/useLifecycleObservation.ts', {
  react: React, '@/hooks/useClientLayoutEffect': layout, '@/context/callbackProvider': callbacks,
  '@layerswap/widget-types': { lifecycleObservationFingerprint: event => event.step },
})
const button = ({ children, onClick, isSubmitting }) => createElement('button', { onClick, disabled: isSubmitting }, children)
const empty = () => null
const { useManualWithdrawController } = loadSource('components/Pages/Swap/Withdraw/ManualWithdraw.tsx', {
  react: React,
  './TransferBlock': { TransferBlock: ({ children, reasonCode, reason, path }) => {
    useTransferBlocked(reasonCode, { swapId: state.swapDetails.id }, path, reason)
    return children
  } },
  '@/components/Buttons/submitButton': { default: button },
  './messages/Message': { default: ({ header, details }) => createElement('p', null, header, details) },
  './Presentation/ManualSourceSelectorView': { ManualSourceSelectorView: empty },
  './Presentation/DepositQRCodeView': { DepositQRCodeView: empty },
  './Presentation/ManualDepositButtonView': loadSource('components/Pages/Swap/Withdraw/Presentation/ManualDepositButtonView.tsx', { '@/components/Buttons/submitButton': { default: button } }),
  '@/components/Input/Address/AddressPicker/AddressWithIcon': { ExtendedAddress: empty },
  '@/components/Widget/Index': { Widget: {} },
  '@/context/asyncModal': { useAsyncModal: () => ({}) },
  '@/context/settings': { useInitialSettings: () => ({}) },
  '@/context/swap': { useSwapDataState: () => state, useSwapDataUpdate: () => ({ mutateDepositActions: async () => { state.retries++; await state.refresh?.() } }) },
  '@/helpers/depositActions': { resolveDepositAddress: (_, actions) => actions?.find(action => action.to_address)?.to_address },
  '@/hooks/useExchangeNetworks': { default: () => ({}) },
  '@/hooks/useWallet': { default: () => ({ wallets: [] }) },
  '@/lib/address/Address': { Address: { isValid: () => false } },
  '@/stores/addressBookStore': { useAddressName: () => undefined },
  '@layerswap/ui-kit': { useCopyClipboard: () => [false, () => { state.copies++ }] },
  '@layerswap/ui-kit/components': { CopyButton: empty },
  '../Form/FeeDetails': { default: empty },
  './Presentation/ManualInstructionsView': { ManualInstructionsView: ({ depositAddress }) => createElement('p', null, depositAddress || 'Loading address') },
  './QuoteUpdate': { handleLimitsUpdate: empty },
  '@/context/callbackProvider': callbacks,
  '@/lib/swapLifecycle': { lifecycleContextFromSwap: (_, swap) => ({ swapId: swap.id }) },
  '@/hooks/useLifecycleObservation': { useLifecycleObservation },
})
let root, container
const swapBasicData = { source_network: { name: 'source' }, destination_network: { name: 'destination' }, source_token: { symbol: 'ETH' }, destination_token: { symbol: 'ETH' } }
function View() {
  const model = useManualWithdrawController({ swapBasicData, depositActions: state.actions }, state.active)
  return createElement(React.Fragment, null, model.controls, state.active ? model.footer : null)
}
const render = () => act(() => root.render(createElement(StrictMode, null, createElement(View))))
beforeEach(() => {
  Object.assign(state, { swapDetails: { id: 'manual-swap' }, actions: undefined, depositActionsError: undefined, active: true, retries: 0, copies: 0, refresh: undefined })
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
    assert.match(container.textContent, /Deposit address unavailable/)
    state.refresh = () => { state.actions = [{ to_address: 'usable-address' }]; state.depositActionsError = undefined }
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

test('a failed retry retains recovery without repeating the mounted block', async () => {
  state.actions = []
  state.refresh = () => { throw new Error('Still unavailable') }
  await render()
  await act(async () => container.querySelector('button').click())
  await render()
  assert.equal(state.retries, 1)
  assert.equal(container.querySelector('button').disabled, false)
  assert.deepEqual(events.map(event => event.reasonCode), ['deposit_actions_unavailable'])
})

test('cached usable instructions remain available after a refresh error', async () => {
  state.actions = [{ to_address: 'cached-address' }]
  state.depositActionsError = 'Refresh failed'
  await render()
  assert.match(container.textContent, /cached-address/)
  assert.equal(container.querySelector('button').disabled, false)
  assert.deepEqual(events.map(event => event.step), ['awaiting_user_deposit'])
})
