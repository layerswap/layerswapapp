import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import React, { act, createElement } from 'react'
import { JSDOM } from 'jsdom'
import { createSwapContext } from './helpers/swap-context.mjs'
import { loadSource, amountPresets, rounding } from './helpers/source.mjs'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const previous = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
after(() => {
  dom.window.close()
  for (const key of ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT']) {
    if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
    else delete globalThis[key]
  }
})
const { createRoot } = await import('react-dom/client')
const noop = () => {}
const token = { symbol: 'ETH', decimals: 6 }
const network = { name: 'BASE_MAINNET', token }
const account = { id: 'wallet', address: 'source' }
const createdAmounts = []
const transfers = []
let revision
const swapCreation = loadSource('lib/swapCreation.ts', {
  '@layerswap/widget-types': { getErrorOccurrenceId: () => 'test' },
  '@/lib/ErrorHandler': { ErrorHandler: noop },
  './swapLifecycle': { lifecycleErrorDetails: () => ({}) },
})
const context = createSwapContext({
  Client: class {
    async CreateSwapAsync(params) {
      createdAmounts.push(params.amount)
      return { data: { swap: { id: 'accepted' }, deposit_actions: [{ type: 'transfer', to_address: 'deposit', amount: Number(params.amount) }] } }
    }
  },
  getSwapId: () => undefined, getAccount: () => account,
  swr: { default: () => ({}) },
  overrides: {
    '@/hooks/useWithdrawalProvider': { useWithdrawalProvider: () => definition },
    '@/lib/preparePresetAmount': { startPresetPreparation: async () => ({
      calculate: async (gasFloor, getDepositGas) => {
        if (revision.depositFee && !gasFloor && !getDepositGas) return '0.9'
        return revision.amount
      },
    }) },
    '@/lib/depositActionGas': {
      estimateDepositActionGas: async () => revision.depositFee ? { gas: 0.105, token } : undefined,
    },
    '@/helpers/gasless': { isGaslessCapableRoute: () => false },
    '@/helpers/swapFlow': loadSource('helpers/swapFlow.ts'),
    '@/lib/extendedRoutes/registry': { resolveExtendedRoutePlan: () => undefined },
    '@/lib/swapLifecycle': { lifecycleContextFromForm: () => ({}) },
    '@/lib/swapCreation': swapCreation,
  },
})
const execution = loadSource('components/Pages/Swap/Withdraw/useWithdrawalExecution.ts', {
  react: React, '@/hooks/useClientLayoutEffect': { useClientLayoutEffect: React.useLayoutEffect },
})
const { useProviderWithdrawal } = loadSource('components/Pages/Swap/Withdraw/WithdrawalProviders/useProviderWithdrawal.ts', {
  react: React,
  '@layerswap/widget-types': { ActionMessageType: {} },
  '@layerswap/wallet-core/errors': { isUserRejection: () => false },
  '@/lib/amountPresets': amountPresets,
  '@/components/utils/RoundDecimals': rounding,
  '@/helpers/depositActions': loadSource('helpers/depositActions.ts'),
  '@/context/swap': context,
  '@/context/withdrawalContext': { useWalletWithdrawalState: () => ({}) },
  '@/context/swapAccounts': { useSelectedAccount: () => account },
  '@/context/settings': { useInitialSettings: () => ({}), useSettingsState: () => ({ networks: [], sourceRoutes: [] }) },
  '@/context/callbackProvider': { useCallbacks: () => ({ onSwapLifecycle: noop }) },
  '@/hooks/useWallet': { default: () => ({ wallets: [account] }) },
  '@/hooks/useTransfer': { useTransfer: () => ({ executeTransfer: async args => { transfers.push(args); return 'hash' } }) },
  '@/stores/swapTransactionStore': { useSwapTransactionStore: selector => selector({ swapTransactions: {} }) },
  '@/lib/swapLifecycle': { lifecycleContextFromSwap: () => ({}) },
  '../Wallet/Common/executeWalletOperation': { executeWalletOperation: (_, execute) => execute() },
  '../useWithdrawalExecution': execution,
  '../withdrawalHelpers': loadSource('components/Pages/Swap/Withdraw/withdrawalHelpers.ts'),
  '../reportWithdrawalError': { reportWithdrawalError: cause => assert.fail(cause.message) },
  './executeProviderWithdrawal': { executeProviderWithdrawal: async ({ prepare, execute }) => execute(await prepare(), noop) },
})
const proposalView = loadSource('components/Pages/Swap/Withdraw/Presentation/AmountProposalView.tsx', {
  '@/components/Icons/InfoIcon': { default: noop },
  '../../Form/SecondaryComponents/validationError/constants': {},
  '../../Form/SecondaryComponents/validationError/ErrorDisplay': loadSource('components/Pages/Swap/Form/SecondaryComponents/validationError/ErrorDisplay.tsx', { react: React }),
  '../../Form/SecondaryComponents/validationError/AdjustAmountButton': { AdjustAmountButton: ({ onEditAmount }) => createElement('button', { onClick: onEditAmount }, 'Adjust amount') },
})
const { SpecializedWithdrawalView } = loadSource('components/Pages/Swap/Withdraw/Presentation/SpecializedWithdrawalView.tsx', {
  '../TransferBlock': { TransferBlock: ({ children }) => children },
  '@layerswap/ui-kit/components': { WalletIcon: noop },
  'lucide-react': { Loader2: noop },
  '../messages/Message': { default: ({ header }) => createElement('p', null, header) },
  '../messages/TransactionMessages': { ActionMessages: {} },
  './WalletActionsView': { ButtonWrapper: ({ children, onClick }) => createElement('button', { onClick }, children) },
  './AmountProposalView': proposalView,
})
const definition = {
  id: 'provider', displayName: 'Provider',
  prepareTransfer: (action, amount) => ({ depositAddress: action.to_address, callData: '', amount }),
}
let data, updates
function Controls({ swap }) {
  const state = useProviderWithdrawal({ swapBasicData: swap, refuel: false }, definition)
  return createElement(SpecializedWithdrawalView, { ...state, provider: 'Provider', network, accountMismatch: false })
}
function Probe() {
  data = context.useSwapDataState()
  updates = context.useSwapDataUpdate()
  return data.swapBasicData ? createElement(Controls, { swap: data.swapBasicData }) : null
}

for (const scenario of [
  { name: 'large preparation reduction', amount: '0.85', depositFee: false },
  { name: 'small preparation reduction', amount: '0.895', depositFee: false },
  { name: 'small deposit-fee reduction', amount: '0.895', depositFee: true },
]) test(`provider withdrawals confirm the accepted source amount after a ${scenario.name}`, async () => {
  revision = scenario
  createdAmounts.length = 0
  transfers.length = 0
  const provisionalAmounts = scenario.depositFee ? ['0.9'] : []
  const container = document.createElement('div')
  const root = createRoot(container)
  try {
    await act(() => root.render(createElement(context.SwapDataProvider, null, createElement(Probe))))
    await act(() => updates.setSubmitedFormValues({
      from: network, to: network, fromAsset: token, toAsset: token, amount: '0.9', destination_address: 'destination',
      depositMethod: 'wallet', amountMode: 'max', amountPresetSource: amountPresets.amountPresetSource(network.name, token.symbol, account.id, account.address),
    }))
    await act(() => container.querySelector('button').click())
    assert.deepEqual(transfers.map(transfer => transfer.amount), [], 'a revised amount must be confirmed before provider execution')
    assert.equal(data.swapBasicData.requested_amount, '0.9')
    assert.equal(data.presetRevisionProposal.amount, scenario.amount)
    assert.equal(data.swapId, undefined)
    assert.equal(container.querySelector('button').textContent, 'Adjust amount')
    assert.doesNotMatch(container.textContent, /Try again/)
    assert.deepEqual(createdAmounts, provisionalAmounts)
    await act(() => container.querySelector('button').click())
    assert.equal(data.presetRevisionProposal, undefined)
    assert.equal(data.swapBasicData.requested_amount, scenario.amount)
    assert.equal(container.querySelector('button').textContent, 'Withdraw from Provider')
    assert.deepEqual(transfers, [])
    await act(() => container.querySelector('button').click())
    assert.deepEqual(createdAmounts, [...provisionalAmounts, scenario.amount])
    assert.deepEqual(transfers.map(transfer => transfer.amount), [Number(scenario.amount)])
  } finally {
    await act(() => root.unmount())
  }
})
