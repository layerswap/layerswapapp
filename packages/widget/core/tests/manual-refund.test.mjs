import assert from 'node:assert/strict'
import test from 'node:test'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { Formik, useFormikContext } from 'formik'
import useSWR, { SWRConfig, useSWRConfig } from 'swr'
import { create } from 'zustand'
import { Address } from './helpers/address.mjs'
import { loadSource, refundAddress, formValidation } from './helpers/source.mjs'

const dom = new JSDOM('<div id="root"></div>')
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const address = '0x1234567890123456789012345678901234567890'
const otherAddress = '0x2222222222222222222222222222222222222222'
const source = { name: 'ETHEREUM_SEPOLIA', display_name: 'Ethereum Sepolia', type: 'evm', token: { symbol: 'ETH' } }
const values = { from: source, to: source, fromAsset: { symbol: 'ETH' }, toAsset: { symbol: 'UNI' },
    amount: '0.005', depositMethod: 'deposit_address', destination_address: otherAddress }
const quote = { quote: { receive_amount: 2, source_token: {}, destination_token: {} } }
const failure = (code, message = code, metadata) => ({ response: { data: { error: { code, message, metadata } } } })
const refundImports = { '@/helpers/refundAddress': refundAddress, '@/lib/address/Address': { Address } }

function quoteModule(fetcher) {
    return loadSource('hooks/useFee.tsx', {
        react: { ...React, default: React }, swr: { default: useSWR, useSWRConfig }, zustand: { create },
        '@/components/utils/numbers': { isDiffByPercent: () => false },
        '@/stores/slippageStore': { useSlippageStore: () => ({}) },
        '@layerswap/utils': { sleep: async () => {} },
        '@/context/settings': { useSettingsState: () => ({ networks: [], sourceRoutes: [] }) },
        '@/lib/extendedRoutes/registry': { resolveExtendedRoutePlan: () => undefined },
        '@layerswap/widget-types': {}, '@/lib/extendedRoutes/transforms': {},
        '@/lib/extendedRoutes/amounts': { isPositiveDecimal: amount => Number(amount) > 0 },
        '@/lib/apiClients': { LayerswapApiClient: class { fetcher = fetcher } },
        '@/context/swapAccounts': { useSelectedAccount: () => undefined },
        '@/stores/gaslessPreferenceStore': { useGaslessPreferenceStore: () => false },
        '@/helpers/gasless': { isGaslessCapableRoute: () => false },
        '@/helpers/swapFlow': { wantsFrontendSwap: () => true }, ...refundImports,
    })
}

async function mountQuotes(t, fetchQuote, initialValues = values) {
    const requests = []
    const fees = quoteModule(async url => {
        if (url.startsWith('/limits')) return { data: { min_amount: 0.001, max_amount: 1 } }
        const params = new URL(url, 'https://local.test').searchParams
        requests.push(params)
        return fetchQuote(params)
    })
    const { ValidationProvider, useValidationContext } = loadSource('context/validationContext.tsx', {
        react: { ...React, default: React }, formik: { useFormikContext },
        '@/lib/widgetTelemetry': { widgetTelemetry: { validation() {} } },
        './settings': { useInitialSettings: () => ({}) },
        '@/hooks/useFee': fees, '@/hooks/useFormValidation': formValidation,
        '@/hooks/useRouteValidation': { useRouteValidation: () => ({ message: '', details: {} }) },
        './swap': { useSwapDataState: () => ({ swapId: 'disable-refresh' }) },
        './swapAccounts': { useSelectedAccount: () => undefined },
        '@/stores': { useSlippageStore: () => ({ autoSlippage: true }) },
        '@/hooks/useAutoSlippageTest': { useAutoSlippageTest: () => ({}) },
        '@/stores/usdModeStore': { useUsdModeStore: () => false },
        '@/helpers/swapFlow': loadSource('helpers/swapFlow.ts'),
        '@/hooks/useExchangeNetworks': { default: () => ({}) },
        '@/helpers/refundAddress': refundAddress,
    })
    let form, currentQuote, validation, showRefundAddress
    function Probe() {
        form = useFormikContext()
        currentQuote = fees.useQuoteData(fees.transformFormValuesToQuoteArgs(form.values), { refreshInterval: 0 })
        validation = useValidationContext().formValidation
        showRefundAddress = useValidationContext().showRefundAddress
        return null
    }
    const root = createRoot(document.getElementById('root'))
    t.after(async () => { await act(() => root.unmount()) })
    await act(async () => root.render(React.createElement(SWRConfig, { value: { provider: () => new Map(), shouldRetryOnError: false } },
        React.createElement(Formik, { initialValues, onSubmit() {} },
            React.createElement(ValidationProvider, null, React.createElement(Probe))))))
    return { requests, get form() { return form }, get quote() { return currentQuote },
        get validation() { return validation }, get showRefundAddress() { return showRefundAddress } }
}

const quoteWithRefund = params => {
    if (!params.get('refund_address')) throw failure('REFUND_ADDRESS_MISSING')
    return { data: quote }
}
const scopedValues = { ...values, refund_address: address, refundAddressNetwork: source.name }

test('missing refunds prompt and only valid explicit addresses are quoted', async t => {
    const app = await mountQuotes(t, quoteWithRefund)
    assert.equal(app.validation.code, 'REFUND_ADDRESS_MISSING')
    assert.equal(app.showRefundAddress, true)
    assert.equal(app.requests[0].get('use_deposit_address'), 'true')
    assert.equal(app.requests[0].has('refund_address'), false, 'destination must not become refund address')
    const count = app.requests.length
    await act(() => app.form.setFieldValue('refund_address', 'bad-address'))
    assert.equal(app.validation.code, 'INVALID_REFUND_ADDRESS')
    assert.equal(app.requests.length, count)
    assert.equal(app.quote.quote, undefined)
    await act(() => app.form.setFieldValue('refund_address', address))
    assert.equal(app.requests.at(-1).get('refund_address'), address)
    assert.equal(app.validation.message, '')
    assert.ok(app.quote.quote)
})

for (const code of [undefined, 'INSUFFICIENT_LIQUIDITY']) {
    test(`${code || 'a successful no-refund quote'} does not prompt for a refund`, async t => {
        const app = await mountQuotes(t, () => {
            if (code) throw failure(code, 'Not enough liquidity')
            return { data: quote }
        })
        assert.equal(app.showRefundAddress, false)
        assert.equal(app.validation.code, code)
    })
}

test('amount edits preserve the recipient and refresh the quote after debounce', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const app = await mountQuotes(t, quoteWithRefund, scopedValues)
    for (const amount of ['', '0', '0.00001', '2']) {
        await act(() => app.form.setFieldValue('amount', amount))
        assert.equal(app.showRefundAddress, false)
        assert.equal(app.form.values.refund_address, address)
        await act(async () => { t.mock.timers.tick(300) })
    }
    await act(() => app.form.setFieldValue('amount', '0.006'))
    assert.equal(app.quote.isDebouncing, true)
    await act(async () => { t.mock.timers.tick(300) })
    assert.equal(app.requests.at(-1).get('amount'), '0.006')
    assert.equal(app.requests.at(-1).get('refund_address'), address)
    assert.equal(app.showRefundAddress, true)
    assert.ok(app.quote.quote)
})

test('debouncing hides the old error and a settled no-refund quote clears the prompt', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const app = await mountQuotes(t, params => {
        if (params.get('amount') === values.amount) throw failure('REFUND_ADDRESS_MISSING')
        return { data: quote }
    })
    assert.equal(app.showRefundAddress, true)
    await act(() => app.form.setFieldValue('amount', '0.003'))
    assert.equal(app.quote.quoteError, undefined)
    await act(async () => { t.mock.timers.tick(300) })
    assert.equal(app.showRefundAddress, false)
    assert.equal(app.validation.message, '')
})

test('changing the recipient suppresses the previous quote until the new request settles', async t => {
    const pending = Promise.withResolvers()
    const app = await mountQuotes(t, params => params.get('refund_address') === otherAddress ? pending.promise : quoteWithRefund(params), scopedValues)
    assert.ok(app.quote.quote)
    await act(() => app.form.setFieldValue('refund_address', otherAddress))
    assert.equal(app.requests.at(-1).get('refund_address'), otherAddress)
    assert.equal(app.quote.quote, undefined)
    assert.equal(app.quote.isQuoteLoading, true)
    await act(async () => pending.resolve({ data: quote }))
    assert.ok(app.quote.quote)
    assert.equal(app.quote.isQuoteLoading, false)
})

test('changing the source drops the old recipient from subsequent quotes', async t => {
    const app = await mountQuotes(t, quoteWithRefund, scopedValues)
    await act(() => app.form.setFieldValue('from', { name: 'SOLANA_MAINNET', display_name: 'Solana', type: 'solana' }))
    assert.equal(app.form.values.refund_address, undefined)
    assert.equal(app.requests.at(-1).has('refund_address'), false)
    assert.equal(app.validation.code, 'REFUND_ADDRESS_MISSING')
})

test('refund scope and quote parameters survive review while no-refund and wallet requests remain unchanged', () => {
    const fees = quoteModule(async () => ({}))
    const scoped = { ...values, refund_address: address, refundAddressNetwork: source.name, refundAddressRequired: true }
    const args = fees.transformFormValuesToQuoteArgs(scoped)
    const params = new URL(fees.buildQuoteUrl({ sourceNetwork: args.from, sourceToken: args.fromCurrency,
        destinationNetwork: args.to, destinationToken: args.toCurrency, amount: args.amount,
        useDepositAddress: true, useFrontendSwap: true, refundAddress: args.refundAddress }), 'https://local.test').searchParams
    assert.equal(params.get('refund_address'), address)
    assert.equal(fees.transformFormValuesToQuoteArgs(values).refundAddress, undefined)
    assert.equal(fees.transformFormValuesToQuoteArgs({ ...scoped, depositMethod: 'wallet' }).refundAddress, undefined)
    assert.equal(refundAddress.manualRefundAddress({ ...scoped, from: { ...source, name: 'BASE_MAINNET' } }), undefined)
    const snapshot = { source_network: source, destination_network: source, source_token: values.fromAsset,
        destination_token: values.toAsset, destination_address: otherAddress, requested_amount: values.amount,
        use_deposit_address: true, refund_address: address }
    assert.equal(fees.transformSwapDataToQuoteArgs(snapshot, false).refundAddress, address)
    const { generateSwapInitialValuesFromSwap } = loadSource('lib/generateSwapInitialValues.ts', {
        '@/lib/extendedRoutes/registry': {}, './extendedRoutes/registry': {}, './address/Address': { Address },
    })
    const networkWithTokens = { ...source, tokens: [values.fromAsset, values.toAsset] }
    const restored = generateSwapInitialValuesFromSwap(snapshot, false, { sourceRoutes: [networkWithTokens], destinationRoutes: [networkWithTokens] }, 'cross-chain')
    assert.equal(refundAddress.manualRefundAddress(restored), address)
})

test('real quote failures retain their meaning, including flag-off unsupported routes', () => {
    const { resolveQuoteError } = formValidation
    assert.equal(resolveQuoteError(failure('QUOTE_REQUIRES_NO_DEPOSIT_ADDRESS')).code, 'MANUAL_TRANSFER_UNSUPPORTED')
    assert.equal(resolveQuoteError(failure('REFUND_ADDRESS_MISSING')).code, 'REFUND_ADDRESS_MISSING')
    assert.equal(resolveQuoteError(failure('INSUFFICIENT_LIQUIDITY', 'Not enough liquidity')).message, 'Not enough liquidity')
    assert.equal(resolveQuoteError(failure('SLIPPAGE_TOO_LOW', 'Increase slippage')).message, 'Increase slippage')
    assert.equal(resolveQuoteError(failure('GREATER_THAN_MAX_ERROR', 'Too high', { AmountLimit: 2 })).message, 'Max amount is 2')
    assert.equal(resolveQuoteError(failure('LESS_THAN_MIN_ERROR', 'Too low', { AmountLimit: 0.01 })).message, 'Min amount is 0.01')
    assert.equal(resolveQuoteError(failure('ROUTE_NOT_FOUND_ERROR', 'Rate not available')).message, 'Rate not available')
    assert.equal(resolveQuoteError(failure('INVALID_ADDRESS_ERROR', 'Invalid refund address')).message, 'Invalid refund address')
    assert.equal(formValidation.resolveFormValidation({ values, minAllowedAmount: 0.01 }).code, 'MIN_AMOUNT_ERROR')
    assert.equal(formValidation.resolveFormValidation({ values: { ...values, refundAddressRequired: true }, quoteError: failure('INSUFFICIENT_LIQUIDITY', 'Not enough liquidity') }).code, 'INSUFFICIENT_LIQUIDITY')
})

test('refund picker commits only valid explicit choices and never changes the destination', async () => {
    let input, form
    const saved = [{ address: otherAddress }]
    const wallets = [
        { id: 'evm', providerName: 'evm', address, addresses: [address], autofillSupportedNetworks: [source.name] },
    ]
    const { default: Picker } = loadSource('components/Input/Address/RefundAddressPicker.tsx', {
        react: { ...React, default: React }, formik: { useFormikContext },
        '@layerswap/ui-kit/components': { ImageWithFallback: () => null },
        '@/components/Modal/vaulModal': { default: ({ show, children, setShow }) => show && React.createElement('section', null,
            children, React.createElement('button', { onClick: () => setShow(false), 'data-close': true }, 'Close')) },
        '@/components/Buttons/submitButton': { default: ({ isDisabled, onClick, children }) => React.createElement('button', { disabled: isDisabled, onClick, 'data-use': true }, children) },
        '@/components/Wallet/WalletComponents/WalletsList': { WalletItem: ({ account, onWalletSelect }) => React.createElement('button', { 'data-wallet': account.id, onClick: () => onWalletSelect({ address: account.address }) }, account.id) },
        '@/hooks/useWallet': { default: () => ({ wallets }) },
        '@/lib/address/Address': { Address },
        '@/stores/addressBookStore': { useAddressBookStore: select => select({ savedAddresses: saved }), savedAddressMatchesNetwork: () => true },
        './AddressPicker': { AddressGroup: { ManualAdded: 'Added Manually' } },
        './AddressPicker/AddressBook': { default: ({ onSelectAddress }) => React.createElement('button', { 'data-saved': true, onClick: () => onSelectAddress(otherAddress) }, 'Saved') },
        './AddressTextInput': { default: props => { input = props; return null } },
    })
    function Probe() {
        form = useFormikContext()
        return React.createElement(Picker, null, open => React.createElement('button', { 'data-open': true, onClick: open }, 'Choose refund address'))
    }
    const root = createRoot(document.getElementById('root'))
    const click = selector => act(() => document.querySelector(selector).click())
    try {
        await act(() => root.render(React.createElement(Formik, { initialValues: values, onSubmit() {} }, React.createElement(Probe))))
        await click('[data-open]')
        assert.equal(document.querySelectorAll('[data-wallet]').length, 1, 'the compatible wallet returned by useWallet is offered')
        assert.equal(form.values.refund_address, undefined, 'opening never autofills the refund')
        await act(() => input.onChange('not-an-address'))
        assert.equal(document.querySelector('[data-use]').disabled, true)
        await act(() => input.onEnter())
        assert.equal(form.values.refund_address, undefined)
        await act(() => input.onChange(` ${address} `))
        assert.equal(document.querySelector('[data-use]').disabled, false)
        await click('[data-use]')
        assert.equal(document.querySelector('section'), null)
        assert.equal(form.values.refund_address, address)
        assert.equal(form.values.refundAddressNetwork, source.name)
        assert.equal(form.values.destination_address, otherAddress)

        await click('[data-open]')
        await act(() => input.onChange('bad edit'))
        await click('[data-close]')
        assert.equal(form.values.refund_address, address, 'cancel keeps the previous valid choice')
        await click('[data-open]')
        assert.equal(input.value, '', 'uncommitted drafts are discarded')
        await click('[data-saved]')
        assert.equal(form.values.refund_address, otherAddress)
        await click('[data-open]')
        await click('[data-wallet="evm"]')
        assert.equal(form.values.refund_address, address)
        assert.equal(form.values.destination_address, otherAddress)
        await click('[data-open]')
        await act(() => form.setFieldValue('from', { name: 'SOLANA_MAINNET', display_name: 'Solana', type: 'solana' }))
        assert.equal(document.querySelector('section'), null, 'source changes dismiss the old network picker')
    } finally {
        await act(() => root.unmount())
    }
})
