import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { createRequire } from 'node:module'
import React, { act, createElement, Fragment, useCallback, useState } from 'react'
import { JSDOM } from 'jsdom'
import { loadSource } from './helpers/source.mjs'

const require = createRequire(import.meta.url)
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://widget.example' })
const previousGlobals = Object.getOwnPropertyDescriptors(globalThis)
const globals = {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
}
for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
const { createRoot } = await import('react-dom/client')
const formik = require('formik')
const swr = require('swr')
const noop = () => {}
const empty = () => null
const passthrough = ({ children }) => createElement(Fragment, null, children)
const destinationNetwork = { name: 'STELLAR_MAINNET', type: 'stellar', display_name: 'Stellar' }
const sourceNetwork = { name: 'BASE_MAINNET', type: 'evm' }
const token = { symbol: 'USDC', contract: 'issuer', decimals: 7 }
const recipient = 'stellar-recipient'
const wallet = { address: recipient, addresses: [recipient] }
const address = { Address: { isValid: value => value === recipient, equals: (left, right) => left === right } }
const settings = { networks: [sourceNetwork, destinationNetwork] }
const walletConnection = { connect: async () => wallet, cancel: noop }
const walletState = { wallets: [wallet] }
const initialValues = {
    from: sourceNetwork,
    fromAsset: token,
    to: destinationNetwork,
    toAsset: token,
    destination_address: recipient,
    depositMethod: 'deposit_address',
    amount: '10',
}

// Load the changed flow, hook, resolver and panel from source. No package build
// is needed, and stale dist files cannot hide either prerequisite regression.
const walletCore = loadSource('../../../wallets/core/src/lib/swapPrerequisites.ts')
const prerequisiteContext = loadSource('context/swapPrerequisites.tsx', { react: React, '@layerswap/wallet-core': walletCore })
const prerequisiteHooks = loadSource('hooks/useSwapPrerequisites.ts', {
    react: React,
    swr,
    '@layerswap/wallet-core': walletCore,
    '../context/swapPrerequisites': prerequisiteContext,
})
const formContext = loadSource('lib/prerequisites/context.ts', { '../address/Address': address })
const spinIcon = loadSource('components/Icons/spinIcon.tsx', { react: React })
const buttonImports = { clsx: { default: require('clsx') }, '../Icons/spinIcon': spinIcon }
const submitButton = loadSource('components/Buttons/submitButton.tsx', buttonImports)
const secondaryButton = loadSource('components/Buttons/secondaryButton.tsx', buttonImports)
const prerequisitePanel = loadSource('components/SwapPrerequisites/PrerequisitePanel.tsx', {
    react: React,
    'lucide-react': { Loader2: empty },
    '@layerswap/wallet-core': walletCore,
    '../Buttons/submitButton': submitButton,
    '../Buttons/secondaryButton': secondaryButton,
    '../Wallet/WalletModal': { useConnectModal: () => walletConnection },
    '../../hooks/useWallet': { default: () => walletState },
    '../../lib/address/Address': address,
    '../../stores/balanceStore': { useBalanceStore: { getState: () => ({ fetchBalance: async () => [] }) } },
    '../../context/settings': { useSettingsState: () => settings },
    '../../context/swapAccounts': { useSelectSwapAccount: () => noop },
})
const sharedImports = {
    react: React,
    formik,
    '@/hooks/useSwapPrerequisites': prerequisiteHooks,
    '@/lib/prerequisites/context': formContext,
    '@/components/SwapPrerequisites/PrerequisitePanel': prerequisitePanel,
    '@/context/validationContext': { useValidationContext: () => ({ formValidation: {} }) },
}

after(() => {
    dom.window.close()
    for (const key of Object.keys(globals)) {
        if (previousGlobals[key]) Object.defineProperty(globalThis, key, previousGlobals[key])
        else delete globalThis[key]
    }
})

function createView(t, provider) {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const providers = [{ swapPrerequisiteProvider: provider }]
    const cache = new Map()
    const swrConfig = { provider: () => cache }
    t.after(async () => {
        await act(() => root.unmount())
        container.remove()
    })
    return {
        container,
        render: child => act(() => root.render(createElement(swr.SWRConfig, { value: swrConfig },
            createElement(prerequisiteContext.SwapPrerequisitesProvider, { providers }, child)))),
        click: button => act(() => button.click()),
        button: label => [...container.querySelectorAll('button')].find(button => button.textContent === label),
    }
}

test('a manual recipient and funded swap survive the transition to processing', async t => {
    let current
    let setProcessing
    let formValues
    const clearedSwaps = []
    const provider = { id: 'recipient', supports: () => true, check: async () => ({ status: 'ready' }) }
    const swapContext = { useSwapDataState: () => current.state, useSwapDataUpdate: () => current.updates }
    const resolvedStatus = loadSource('hooks/useResolvedSwapStatus.ts', { '../context/swap': swapContext })
    const DepositAddressForm = loadSource('components/Pages/Swap/Form/DepositAddressForm/index.tsx', {
        ...sharedImports,
        '@layerswap/widget-types': { SwapStatus: { Created: 'created', UserTransferPending: 'user_transfer_pending' } },
        'lucide-react': { Loader2: empty },
        '@/components/Widget/Index': { Widget: { Content: passthrough, Footer: passthrough } },
        '@/hooks/useWallet': { default: () => walletState },
        '@layerswap/wallet-core': { useProvidersConnectReady: () => true },
        '@/lib/address/Address': address,
        '@/hooks/useAutoSourceRoute': { default: () => ({ isAutoSourceUpdating: false }) },
        '@/context/swap': swapContext,
        '@/context/settings': { useInitialSettings: () => ({}), useSettingsState: () => settings },
        '@/context/swapAccounts': { useSelectedAccount: () => ({ id: 'manually_added', address: recipient }) },
        '@/lib/generateSwapInitialValues': { generateSwapInitialValues: () => ({}) },
        '@/lib/apiClients/layerSwapApiClient': { TransactionType: { Input: 'input', Output: 'output' } },
        './EasyDepositBanner': { default: empty },
        './PayFromPicker': { default: empty },
        './ReceivePicker': { default: empty },
        './DepositAddressInfo': { default: () => createElement('p', null, 'Send your deposit') },
        './DepositAddressFormButton': { default: empty },
        './DepositAddressTransition': { DepositAddressTransition: ({ instructions, processing }) => createElement(Fragment, null, instructions, processing) },
        '@/helpers/depositActions': { resolveDepositAddress: () => 'deposit-address' },
        '@/components/Wallet/WalletModal': { useConnectModal: () => walletConnection },
        '../../Withdraw/Processing': { default: () => createElement('p', null, 'Deposit processing') },
        '../../Withdraw/Summary': { default: empty },
        '../SecondaryComponents/validationError': { default: empty },
        '../SecondaryComponents/validationError/ErrorDisplay': { ErrorDisplay: empty },
        '@/components/Icons/FailIcon': { default: empty },
        '@/hooks/useResolvedSwapStatus': resolvedStatus,
    }).default
    function FormProbe() {
        formValues = formik.useFormikContext().values
        return createElement(DepositAddressForm, { disableAutoConnect: true })
    }
    function Harness() {
        const [processing, updateProcessing] = useState(false)
        const [swapId, updateSwapId] = useState('funded-swap')
        setProcessing = updateProcessing
        const setSwapId = useCallback(value => { clearedSwaps.push(value); updateSwapId(value) }, [])
        current = {
            state: {
                swapId,
                swapBasicData: { source_network: sourceNetwork, source_token: token, destination_network: destinationNetwork, destination_token: token, destination_address: recipient },
                swapDetails: { id: 'funded-swap', status: processing ? 'ls_transfer_pending' : 'created', transactions: processing ? [{ type: 'input' }] : [] },
                resolved: { showWithdrawScreen: !processing },
                setSwapError: noop,
            },
            updates: { setSwapId, mutateSwap: noop, mutateDepositActions: noop },
        }
        return createElement(formik.Formik, { initialValues, onSubmit: () => assert.fail('An existing funded swap must not be recreated') }, createElement(FormProbe))
    }
    const view = createView(t, provider)
    await view.render(createElement(Harness))
    assert.match(view.container.textContent, /Send your deposit/)

    await act(() => setProcessing(true))

    assert.equal(formValues.destination_address, recipient)
    assert.equal(current.state.swapId, 'funded-swap')
    assert.deepEqual(clearedSwaps, [])
    assert.match(view.container.textContent, /Deposit processing/)
    assert.doesNotMatch(view.container.textContent, /Send your deposit/)
})

test('wallet deposits require setup and a fresh quoted-amount check before continuing', async t => {
    let setupComplete = false
    let quoteCheck
    const checks = []
    const executions = []
    const submissions = []
    const receiveAmount = 9.25
    const provider = {
        id: 'recipient',
        supports: () => true,
        async check(context) {
            checks.push(context)
            if (context.receiveAmount != null) return quoteCheck.promise
            return setupComplete ? { status: 'ready' } : {
                status: 'required',
                title: 'Enable USDC',
                description: 'Add a trustline before continuing.',
                action: { id: 'add-trustline', label: 'Add trustline', wallet: { network: destinationNetwork, address: recipient } },
            }
        },
        async execute(context, actionId, { wallet }) {
            executions.push({ context, actionId, wallet })
            setupComplete = true
        },
    }
    const AmountStep = loadSource('components/Pages/Deposit/Wallet/AmountStep.tsx', {
        ...sharedImports,
        '@/lib/amountPresets': { isAmountPreset: () => false },
        '@/components/Buttons/submitButton': submitButton,
        '@/components/Input/SourcePicker': { default: empty },
        '@/hooks/useFee': { useQuoteData: () => ({ quote: { quote: { receive_amount: receiveAmount } }, isQuoteLoading: false }) },
        '@/context/swapAccounts': { useSelectedAccount: () => ({ address: 'source-wallet' }) },
        '@/components/Pages/Swap/Form/FeeDetails': { default: empty },
        '../depositStepContext': { useDepositStep: () => ({ back: noop }) },
        '../_shared/QuoteSummary': { default: empty },
    }).default
    function Harness() {
        const [processing, setProcessing] = useState(false)
        return createElement(formik.Formik, {
            initialValues: { ...initialValues, depositMethod: 'wallet' },
            onSubmit: async values => { submissions.push(values); setProcessing(true) },
        }, processing ? createElement('p', null, 'Wallet processing') : createElement(AmountStep))
    }
    const view = createView(t, provider)
    await view.render(createElement(Harness))

    assert.match(view.container.textContent, /Add a trustline before continuing/)
    assert.equal(view.button('Enable USDC').disabled, true)
    await view.click(view.button('Enable USDC'))
    assert.deepEqual(submissions, [])
    assert.equal(checks.some(context => context.receiveAmount != null), false)

    await view.click(view.button('Add trustline'))
    assert.equal(executions.length, 1)
    assert.equal(executions[0].actionId, 'add-trustline')
    assert.equal(executions[0].wallet.address, recipient)
    assert.equal(view.button('Continue').disabled, false)

    quoteCheck = Promise.withResolvers()
    await view.click(view.button('Continue'))
    assert.equal(view.button('Continue').disabled, true)
    assert.deepEqual(submissions, [], 'continuation waits for the fresh check')
    assert.equal(checks.filter(context => context.receiveAmount != null).length, 1)
    assert.equal(checks.at(-1).receiveAmount, String(receiveAmount))
    assert.equal(checks.at(-1).destination.address, recipient)

    await act(() => quoteCheck.resolve({ status: 'blocked', description: 'Increase your USDC receiving limit.' }))
    assert.match(view.container.querySelector('[role="alert"]').textContent, /Increase your USDC receiving limit/)
    assert.deepEqual(submissions, [], 'a failed amount check must not enter processing')
    assert.equal(view.button('Continue').disabled, false)

    quoteCheck = Promise.withResolvers()
    await view.click(view.button('Continue'))
    assert.equal(view.container.querySelector('[role="alert"]'), null)
    assert.deepEqual(submissions, [])
    await act(() => quoteCheck.resolve({ status: 'ready' }))
    assert.equal(submissions.length, 1)
    assert.equal(submissions[0].destination_address, recipient)
    assert.equal(submissions[0].depositMethod, 'wallet')
    assert.equal(checks.filter(context => context.receiveAmount != null).length, 2)
    assert.match(view.container.textContent, /Wallet processing/)
})
