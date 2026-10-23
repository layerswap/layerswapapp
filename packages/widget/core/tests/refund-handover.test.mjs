import assert from 'node:assert/strict'
import test from 'node:test'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { Formik, Form, useFormikContext } from 'formik'
import { loadSource, refundAddress, formValidation } from './helpers/source.mjs'
import { Address } from './helpers/address.mjs'
import { createSwapContext } from './helpers/swap-context.mjs'

const dom = new JSDOM('<div id="root"></div>')
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.localStorage = { getItem: () => null }
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const noop = () => {}
const empty = () => null
const wrapper = ({ children }) => children
const react = { ...React, default: React }
const source = { name: 'ETHEREUM_SEPOLIA', display_name: 'Ethereum Sepolia', type: 'evm', token: { symbol: 'ETH' }, tokens: [] }
const destination = { ...source, name: 'BASE_SEPOLIA', display_name: 'Base Sepolia' }
const address = '0x1234567890123456789012345678901234567890'
const destinationAddress = '0x2222222222222222222222222222222222222222'
const values = { from: source, to: destination, fromAsset: { symbol: 'ETH' }, toAsset: { symbol: 'UNI' },
    depositMethod: 'deposit_address', destination_address: destinationAddress }
const missingRefund = { response: { data: { error: { code: 'REFUND_ADDRESS_MISSING' } } } }
const settings = { useInitialSettings: () => ({}), useSettingsState: () => ({ networks: [] }) }
const swapResponse = (id, form, refund = refundAddress.manualRefundAddress(form)) => ({ swap: {
    id, source_network: form.from, source_token: form.fromAsset,
    destination_network: form.to, destination_token: form.toAsset,
    destination_address: form.destination_address, refund_address: refund,
    requested_amount: form.amount || '', transactions: [], use_deposit_address: true, status: 'created',
}, deposit_actions: [{ type: 'manual_transfer', network: form.from, to_address: `deposit-${id}` }] })
const swapCreation = loadSource('lib/swapCreation.ts', {
    '@layerswap/widget-types': { getErrorOccurrenceId: () => 'test-error' },
    '@/lib/ErrorHandler': { ErrorHandler: noop },
    './swapLifecycle': { lifecycleErrorDetails: () => ({}) },
})
const pending = () => Promise.withResolvers()
const { default: SwapForm } = loadSource('components/Pages/Swap/Form/SwapForm.tsx', {
    react, formik: { Formik },
    '@/lib/amountPresets': { isAmountPreset: () => false },
    '@/context/callbackProvider': { useCallbacks: () => ({ onSwapLifecycle: noop }) },
    '@/lib/swapLifecycle': { lifecycleContextFromForm: () => ({}) },
    './FormTelemetry': { default: empty }, './AmountPresetController': { default: empty },
    '@/helpers/refundAddress': refundAddress,
})

function loadValidationContext(swapContext, hasQuote = true) {
    // Keep the previously successful quote cached throughout a failed create.
    const successfulQuote = { quote: { receive_amount: 2 } }
    return loadSource('context/validationContext.tsx', {
        react, formik: { useFormikContext }, './settings': settings,
        '@/lib/widgetTelemetry': { widgetTelemetry: { validation: noop } },
        '@/hooks/useFee': {
            transformFormValuesToQuoteArgs: () => ({}),
            useQuoteData: () => ({
                ...(hasQuote ? { minAllowedAmount: 0.001, maxAllowedAmount: 1, quote: successfulQuote } : {}),
                isQuoteLoading: false, isDebouncing: false }),
        },
        '@/hooks/useFormValidation': formValidation,
        '@/hooks/useRouteValidation': { useRouteValidation: () => ({ message: '', details: {} }) },
        './swap': swapContext, './swapAccounts': { useSelectedAccount: () => undefined },
        '@/stores': { useSlippageStore: () => ({ autoSlippage: true }) },
        '@/hooks/useAutoSlippageTest': { useAutoSlippageTest: () => ({}) },
        '@/stores/usdModeStore': { useUsdModeStore: () => false },
        '@/helpers/swapFlow': loadSource('helpers/swapFlow.ts'),
        '@/hooks/useExchangeNetworks': { default: () => ({}) },
        '@/helpers/refundAddress': refundAddress,
    })
}

function loadRefundAddressField(validationContext) {
    const { default: RefundAddressPicker } = loadSource('components/Input/Address/RefundAddressPicker.tsx', {
        react, formik: { useFormikContext },
        '@layerswap/ui-kit/components': { ImageWithFallback: empty },
        '@/components/Modal/vaulModal': { default: ({ show, children }) => show && React.createElement('section', { 'aria-label': 'Refund address' }, children) },
        '@/components/Buttons/submitButton': { default: empty },
        '@/components/Wallet/WalletComponents/WalletsList': { WalletItem: ({ account, onWalletSelect }) =>
            React.createElement('button', { type: 'button', 'data-wallet': true, onClick: () => onWalletSelect({ address: account.address }) }, 'Use connected wallet') },
        '@/hooks/useWallet': { default: () => ({ wallets: [{ id: 'wallet', providerName: 'evm', address: destinationAddress,
            addresses: [destinationAddress], autofillSupportedNetworks: [source.name] }] }) },
        '@/lib/address/Address': { Address },
        '@/stores/addressBookStore': { useAddressBookStore: select => select({ savedAddresses: [] }) },
        './AddressPicker': {}, './AddressPicker/AddressBook': { default: empty }, './AddressTextInput': { default: empty },
    })
    const { default: RefundAddressField } = loadSource('components/Pages/Swap/Form/RefundAddressField.tsx', {
        formik: { useFormikContext }, '@/context/validationContext': validationContext,
        '@/helpers/refundAddress': refundAddress,
        '@/components/Input/Address/RefundAddressPicker': { default: RefundAddressPicker },
        '@/components/Input/Address/RefundAddressSummary': { default: ({ address: recipient, onEdit }) =>
            React.createElement('div', { 'data-refund': true }, recipient, React.createElement('button', { type: 'button', 'aria-label': recipient ? 'Change refund address' : 'Choose refund address', onClick: onEdit }, recipient ? 'Change' : 'Choose address')) },
    })
    return RefundAddressField
}

async function mountCreateRecovery(t, { amount = '0.005', type = 'cross-chain', failure = 'http' } = {}) {
    let form, validation
    const submissions = [], ids = []
    const create = submitted => swapCreation.requestSwap({
        request: async () => {
            if (submitted.refund_address) return { data: swapResponse('created', submitted) }
            if (failure === 'http') throw missingRefund
            return { error: { code: 'REFUND_ADDRESS_MISSING', message: 'Refund required' } }
        },
        useGasless: false,
    }, noop)
    const swapContext = {
        useSwapDataState: () => ({ setSwapError: noop }),
        useSwapDataUpdate: () => ({
            createSwap: submitted => { submissions.push(submitted); return create(submitted) },
            setSwapId: id => ids.push(id), setSubmitedFormValues: noop, setSwapModalOpen: noop,
        }),
    }
    const validationModule = loadValidationContext(swapContext, type !== 'deposit-address')
    const RefundAddressField = loadRefundAddressField(validationModule)
    function Probe() {
        form = useFormikContext()
        validation = validationModule.useValidationContext()
        return React.createElement(RefundAddressField, { showSelected: type === 'deposit-address' })
    }
    const Drawer = Object.assign(empty, { Snap: empty })
    const { default: FormWrapper } = loadSource('components/Pages/Swap/Form/FormWrapper.tsx', {
        react, '@/context/settings': settings, '@/context/swap': swapContext,
        '@/components/Pages/Swap/Form/SecondaryComponents/ConnectNetwork': { default: empty },
        '@/lib/generateSwapInitialValues': { generateSwapInitialValues: () => ({ ...values, amount }) },
        '@layerswap/widget-types': { LSAPIKnownErrorCode: {} },
        '@/hooks/useWallet': { default: () => ({ wallets: [], getProvider: noop }) },
        '@/context/asyncModal': { useAsyncModal: () => ({ getConfirmation: async () => true }) },
        '@/components/Modal/vaulModal': { default: Drawer },
        '@/lib/balances/useBalance': { useBalance: () => ({ mutate: noop }) },
        '@/context/swapAccounts': { useSelectedAccount: () => undefined },
        '@/components/Common/Sceletons': { SwapDetailsSceleton: empty },
        '@/context/callbackProvider': { useCallbacks: () => ({ onSwapLifecycle: noop, onSwapModalStateChange: noop }) },
        '@/components/Input/Address/ContractAddressNote': { default: empty },
        '@/stores/contractAddressStore': { useContractAddressStore: () => ({ isConfirmed: () => true }) },
        '@/components/Input/Address/UrlAddressNote': { default: empty },
        '@/lib/address/Address': { Address },
        './SecondaryComponents/validationError/ContractAddressValidationCache': { default: empty, ContractSourceAddressValidationCache: empty },
        '@/stores/gaslessPreferenceStore': { useGaslessPreferenceStore: { getState: () => ({ clearGaslessUnavailable: noop }) } },
        '@/context/formQuote': { FormQuoteReportProvider: wrapper },
        '@/lib/routeSpeed': { isVerySlowRoute: () => false },
        './SecondaryComponents/SlowRouteNote': { default: empty },
        '@/lib/swapLifecycle': { lifecycleContextFromForm: () => ({}) },
        '@/hooks/useResolvedSwapStatus': { useResolvedSwapStatus: () => ({}) },
        './SwapForm': { default: SwapForm },
        '@/helpers/refundAddress': refundAddress,
    })
    const root = createRoot(document.getElementById('root'))
    t.after(async () => { await act(() => root.unmount()) })
    await act(() => root.render(React.createElement(FormWrapper, { type },
        React.createElement(validationModule.ValidationProvider, null, React.createElement(Probe)))))
    return { get form() { return form }, get validation() { return validation }, submissions, ids }
}

for (const failure of ['http', 'envelope']) {
    test(`a ${failure} create-time refund requirement survives a cached quote until a valid recipient is supplied`, async t => {
        const app = await mountCreateRecovery(t, { failure })
        assert.equal(app.validation.formValidation.message, '')
        await act(() => app.form.submitForm())
        assert.equal(app.validation.showRefundAddress, true)
        assert.equal(app.validation.formValidation.code, 'REFUND_ADDRESS_MISSING')
        await act(() => app.form.setFieldValue('refund_address', 'invalid', false))
        assert.equal(app.form.values.refundAddressRequired, true)
        assert.equal(app.validation.formValidation.code, 'INVALID_REFUND_ADDRESS')
        await act(() => app.form.submitForm())
        assert.equal(app.submissions.length, 1, 'the real SwapForm blocks an invalid refund before creation')
        await act(() => app.form.setFieldValue('refund_address', address, false))
        assert.equal(app.validation.formValidation.message, '')
        await act(() => app.form.submitForm())
        assert.equal(app.submissions.length, 2)
        assert.equal(refundAddress.manualRefundAddress(app.submissions[1]), address)
    })

}

for (const [field, next] of Object.entries({ amount: '0.006', from: destination,
    toAsset: { symbol: 'ETH' }, depositMethod: 'wallet' })) {
    test(`changing ${field} clears the creation requirement and ignores late rejections`, async t => {
        const app = await mountCreateRecovery(t)
        const submitted = app.form.values
        await act(() => app.form.submitForm())
        await act(() => app.form.setFieldValue(field, next, false))
        assert.equal(app.form.values.refundAddressRequired, false)
        assert.equal(app.form.values.refundAddressRequiredFor, undefined)
        assert.equal(refundAddress.requireRefundAddress(app.form.values, submitted), app.form.values)
    })
}

test('the amountless deposit tab exposes a refund picker after rejection and accepts the explicit choice', async t => {
    const app = await mountCreateRecovery(t, { amount: '', type: 'deposit-address' })
    assert.equal(document.querySelector('[data-refund]'), null)
    await act(() => app.form.submitForm())
    assert.equal(app.validation.formValidation.code, 'REFUND_ADDRESS_MISSING')
    assert.ok(document.querySelector('[aria-label="Choose refund address"]'))
    await act(() => document.querySelector('[aria-label="Choose refund address"]').click())
    await act(() => document.querySelector('[data-wallet]').click())
    assert.equal(app.validation.formValidation.message, '')
    await act(() => app.form.submitForm())
    assert.equal(app.submissions.length, 2)
    assert.equal(refundAddress.manualRefundAddress(app.submissions[1]), destinationAddress)
    assert.equal(app.submissions[1].amount, '')
    assert.deepEqual(app.ids, ['created'])
})

async function mountPrefetch(t, { ready = false, response = swapResponse('prefetched', values, address), beforeCreate = noop } = {}) {
    const request = pending()
    const creates = [], claims = []
    const responses = new Map([[response.swap.id, { data: response }]])
    let form, view, state, used = false
    const swapContext = createSwapContext({
        Client: class {
            async CreateSwapAsync(params) {
                creates.push(params)
                const errorResponse = await beforeCreate(params)
                if (errorResponse) return errorResponse
                const created = swapResponse(`replacement-${creates.length}`, { ...values,
                    from: params.source_network === source.name ? source : destination, amount: params.amount,
                }, params.refund_address)
                responses.set(created.swap.id, { data: created })
                return { data: created }
            }
        },
        getSwapId: () => undefined, getAccount: () => undefined,
        swr: { default: key => {
            const id = typeof key === 'string' && key.match(/^\/swaps\/([^/]+)\/deposit_actions/)?.[1]
            return { data: id ? { data: responses.get(id)?.data.deposit_actions } : undefined }
        } },
        overrides: {
            '@/hooks/useSwapPolling': { useSwapPolling: id => ({ data: responses.get(id), mutate: noop }) },
            '@/helpers/swapFlow': loadSource('helpers/swapFlow.ts'),
            '@/helpers/gasless': { isGaslessCapableRoute: () => false },
            '@/lib/extendedRoutes/registry': { resolveExtendedRoutePlan: () => undefined },
            '@/lib/swapLifecycle': { lifecycleContextFromForm: () => ({}) },
            '@/lib/swapCreation': swapCreation,
        },
    })
    const validationContext = loadValidationContext(swapContext, false)
    const RefundAddressField = loadRefundAddressField(validationContext)
    const { default: DepositAddressForm } = loadSource('components/Pages/Swap/Form/DepositAddressForm/index.tsx', {
        react, formik: { Form, useFormikContext },
        '@layerswap/widget-types': { SwapStatus: { Created: 'created', UserTransferPending: 'user_transfer_pending' } },
        'lucide-react': { Loader2: empty }, '@/components/Widget/Index': { Widget: { Content: wrapper, Footer: wrapper } },
        '@/context/validationContext': validationContext,
        '@/hooks/useWallet': { default: () => ({ wallets: [] }) },
        '@layerswap/wallet-core': { useProvidersConnectReady: () => true },
        '@/lib/address/Address': { Address }, '@/hooks/useAutoSourceRoute': { default: () => ({ isAutoSourceUpdating: false }) },
        '@/context/swap': swapContext, '@/context/settings': settings,
        '@/context/swapAccounts': { useSelectedAccount: () => undefined },
        '@/lib/generateSwapInitialValues': {}, '@/lib/apiClients/layerSwapApiClient': { TransactionType: {} },
        './EasyDepositBanner': { default: empty }, './PayFromPicker': { default: empty }, './ReceivePicker': { default: empty },
        './DepositAddressInfo': { default: props => { view = props; return null } },
        './DepositAddressFormButton': { default: empty },
        './DepositAddressTransition': { DepositAddressTransition: ({ instructions }) => instructions },
        '@/helpers/depositActions': loadSource('helpers/depositActions.ts'),
        '@/components/Wallet/WalletModal': { useConnectModal: () => ({ connect: noop, cancel: noop }) },
        '../SecondaryComponents/validationError': { default: empty },
        '../SecondaryComponents/validationError/ErrorDisplay': { ErrorDisplay: empty },
        '@/components/Icons/FailIcon': { default: empty }, '../RefundAddressField': { default: RefundAddressField },
        '@/helpers/refundAddress': refundAddress,
    })
    function Probe() { form = useFormikContext(); state = swapContext.useSwapDataState(); return null }
    const { default: TransferCrypto } = loadSource('components/Pages/Deposit/TransferCrypto/index.tsx', {
        react, formik: { useFormikContext },
        '@/components/Pages/Swap/Form/SwapForm': { default: props =>
            React.createElement(SwapForm, props, React.createElement(Probe), props.children) },
        '@/components/Pages/Swap/Form/DepositAddressForm': { default: DepositAddressForm },
        '@/components/Pages/Swap/Form/DepositAddressForm/ReceivePicker': { default: empty },
        '@/context/validationContext': validationContext, '@/context/swap': swapContext, '@/context/settings': settings,
        '@layerswap/widget-types': { LSAPIKnownErrorCode: {} },
        '../depositSelectionContext': { useDepositInitialValues: () => values,
            useDepositSelection: () => ({ destinationAddress: values.destination_address }) },
        '../depositPrefetchContext': { useDepositPrefetch: () => ({
            prefetchedSwap: ready ? response : undefined,
            claimPrefetchedSwap: submitted => { claims.push(submitted); return used ? undefined : request.promise },
            markSwapUsed: () => { used = true },
        }) },
        '../depositStepContext': { useReportCloseLock: noop },
        '@/hooks/useResolvedSwapStatus': { useResolvedSwapStatus: () => ({}) },
        '@/lib/apiClients/layerSwapApiClient': { TransactionType: {} },
        '@/lib/address/Address': { Address },
        '@/helpers/refundAddress': refundAddress,
    })
    const root = createRoot(document.getElementById('root'))
    t.after(async () => { await act(() => root.unmount()) })
    const render = () => act(() => root.render(React.createElement(TransferCrypto)))
    await render()
    return { get form() { return form }, get view() { return view }, get state() { return state },
        creates, claims,
        resolve: async () => { await act(() => request.resolve(response)) },
        rejectPrefetch: async () => { await act(() => request.reject(missingRefund)) },
        pollWithoutRefund: async () => {
            const previous = responses.get(state.swapId).data
            const { refund_address, ...polledSwap } = previous.swap
            responses.set(state.swapId, { data: { ...previous, swap: polledSwap } })
            await render()
        },
    }
}

for (const ready of [true, false]) {
    test(`${ready ? 'ready' : 'in-flight'} prefetch retains its refund recipient and deposit address`, async t => {
        const app = await mountPrefetch(t, { ready })
        if (!ready) { assert.equal(app.claims.length, 1); await app.resolve() }
        assert.equal(app.form.values.refund_address, address)
        assert.equal(app.form.values.refundAddressNetwork, source.name)
        assert.equal(app.state.swapId, 'prefetched')
        assert.equal(app.view.isCreatingSwap, false)
        assert.equal(app.view.depositAddress, 'deposit-prefetched')
        assert.equal(app.creates.length, 0)

        await app.pollWithoutRefund()
        assert.equal(app.state.swapBasicData.refund_address, address)
        assert.equal(app.state.swapId, 'prefetched')
        assert.equal(app.view.depositAddress, 'deposit-prefetched')
        assert.equal(app.creates.length, 0)

        // Exercise the visible editor, not a direct Formik update.
        assert.ok(document.querySelector('[data-refund]')?.textContent.includes(address))
        await act(() => document.querySelector('[aria-label="Change refund address"]').click())
        assert.ok(document.querySelector('section[aria-label="Refund address"]'))
        await act(() => document.querySelector('[data-wallet]').click())
        assert.notEqual(app.state.swapId, 'prefetched')
        assert.equal(app.creates[0].refund_address, destinationAddress)
        const replacementId = app.state.swapId
        await app.pollWithoutRefund()
        assert.equal(app.state.swapId, replacementId)
        assert.equal(app.state.swapBasicData.refund_address, destinationAddress, 'each swap keeps its own accepted recipient')
        assert.equal(app.creates.length, 1)
    })
}

test('an in-flight prefetch does not overwrite a refund recipient chosen while waiting', async t => {
    const app = await mountPrefetch(t)
    await act(() => app.form.setValues(current => ({ ...current, refund_address: destinationAddress, refundAddressNetwork: source.name }), false))
    await app.resolve()
    assert.equal(app.form.values.refund_address, destinationAddress)
    assert.notEqual(app.state.swapId, 'prefetched')
    const replacementId = app.state.swapId
    await app.pollWithoutRefund()
    assert.equal(app.state.swapId, replacementId)
    assert.equal(app.state.swapBasicData.refund_address, destinationAddress)
})

test('an in-flight prefetch cannot seed its refund into a changed source', async t => {
    const app = await mountPrefetch(t)
    await act(() => app.form.setFieldValue('from', destination, false))
    await app.resolve()
    assert.equal(app.form.values.refund_address, undefined)
    assert.equal(app.form.values.refundAddressNetwork, undefined)
    assert.notEqual(app.state.swapId, 'prefetched')
    const replacementId = app.state.swapId
    await app.pollWithoutRefund()
    assert.equal(app.state.swapId, replacementId)
    assert.equal(app.state.swapBasicData.refund_address, undefined, 'the old swap refund must not leak into a new source')
    assert.equal(document.querySelector('[data-refund]'), null)
})

test('a legacy prefetch without a refund still hands over unchanged', async t => {
    const app = await mountPrefetch(t, { ready: true, response: swapResponse('prefetched', values) })
    assert.equal(app.form.values.refund_address, undefined)
    assert.equal(app.state.swapId, 'prefetched')
    assert.equal(app.view.isCreatingSwap, false)
    assert.equal(app.creates.length, 0)
    assert.equal(document.querySelector('[data-refund]'), null, 'legacy amountless deposits do not gain an empty refund prompt')
})

for (const failure of ['http', 'envelope']) {
    test(`the amountless deposit widget recovers from a ${failure} missing-refund error through the picker`, async t => {
        const app = await mountPrefetch(t, { beforeCreate: params => {
            if (params.refund_address) return
            if (failure === 'http') throw missingRefund
            return { error: { code: 'REFUND_ADDRESS_MISSING', message: 'Refund required' } }
        } })
        assert.equal(document.querySelector('[data-refund]'), null, 'no prompt before a rejection')
        await app.rejectPrefetch()
        assert.equal(app.creates.length, 1)
        assert.equal(app.state.swapId, undefined)
        assert.ok(document.querySelector('[aria-label="Choose refund address"]'))
        await act(() => document.querySelector('[aria-label="Choose refund address"]').click())
        await act(() => document.querySelector('[data-wallet]').click())
        assert.equal(app.creates.length, 2, 'choosing a refund recipient automatically retries the deposit')
        assert.equal(app.creates[1].refund_address, destinationAddress)
        assert.equal(app.creates[1].amount, undefined)
        assert.equal(app.state.swapId, 'replacement-2')
        assert.equal(app.view.depositAddress, 'deposit-replacement-2')
        assert.ok(!app.state.swapError)
    })
}

test('the amountless deposit widget ignores a missing-refund rejection for an earlier source', async t => {
    const request = pending()
    const app = await mountPrefetch(t, { beforeCreate: params =>
        params.source_network === source.name ? request.promise : undefined })
    await app.rejectPrefetch()
    assert.equal(app.creates.length, 1)
    await act(() => app.form.setFieldValue('from', destination, false))
    await act(() => request.reject(missingRefund))
    assert.ok(!app.form.values.refundAddressRequired)
    assert.equal(document.querySelector('[data-refund]'), null)
    assert.equal(app.creates.length, 2)
    assert.equal(app.creates[1].source_network, destination.name)
    assert.equal(app.state.swapId, 'replacement-2')
})
