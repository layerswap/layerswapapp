import assert from 'node:assert/strict'
import test from 'node:test'
import { registerHooks } from 'node:module'
import {
    AUTO_RECEIVE_SETTINGS,
    formReceiveSettingsScope,
    isTokenSwap,
    quotedMinimumInput,
    receiveRequestParams,
    receiveSettingsError,
    receiveSettingsScope,
    resolveReceiveSettings,
} from '../src/lib/receiveSettings.ts'
import { buildQuoteUrl } from '../src/lib/quoteRequest.ts'

// Node strips types; resolve the extensionless relative import used by the store.
registerHooks({
    resolve(specifier, context, nextResolve) {
        try { return nextResolve(specifier, context) }
        catch (error) {
            if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.')) {
                return nextResolve(`${specifier}.ts`, context)
            }
            throw error
        }
    },
})
const { useSlippageStore } = await import('../src/stores/slippageStore.ts')

const route = { amount: '100', from: 'ETHEREUM_MAINNET', fromCurrency: 'USDC', to: 'ARBITRUM_MAINNET', toCurrency: 'USDT', depositMethod: 'wallet' }
const scope = receiveSettingsScope(route)
const minimum = amount => ({ mode: 'minimum', amount, scope, precision: 6 })
const quoteArgs = { sourceNetwork: route.from, sourceToken: route.fromCurrency, destinationNetwork: route.to, destinationToken: route.toCurrency, amount: route.amount, refuel: true, useDepositAddress: false }

test('minimum and manual slippage each serialize one input through quote and create-swap', () => {
    for (const settings of [AUTO_RECEIVE_SETTINGS, minimum('98.123456'), { mode: 'slippage', percent: '1.25' }]) {
        const params = receiveRequestParams(settings)
        const query = new URLSearchParams(buildQuoteUrl({ ...quoteArgs, slippage: params.slippage === undefined ? undefined : Number(params.slippage), minReceiveAmount: params.min_receive_amount }).split('?')[1])
        const createBody = JSON.parse(JSON.stringify({ amount: route.amount, ...params }))
        assert.equal(query.get('amount'), '100')
        assert.equal(createBody.amount, '100')
        assert.equal(query.get('min_receive_amount'), createBody.min_receive_amount ?? null)
        assert.equal(query.get('slippage'), createBody.slippage ?? null)
        assert.ok(!(query.has('slippage') && query.has('min_receive_amount')))
        assert.equal(query.get('refuel'), 'true')
        assert.equal(query.get('use_deposit_address'), 'false')
    }
    assert.deepEqual(receiveRequestParams({ mode: 'slippage', percent: '1.25' }), { slippage: '0.0125' })
})

test('quote URL cannot send conflicting explicit fields and retains address/gasless flags', () => {
    const query = new URLSearchParams(buildQuoteUrl({ ...quoteArgs, slippage: 0.01, minReceiveAmount: '98', sourceAddress: 'source', destinationAddress: 'destination', useGasless: true }).split('?')[1])
    assert.equal(query.get('min_receive_amount'), '98')
    assert.equal(query.has('slippage'), false)
    assert.equal(query.get('source_address'), 'source')
    assert.equal(query.get('destination_address'), 'destination')
    assert.equal(query.get('use_gasless'), 'true')
})

test('minimum text survives refreshes; selecting slippage or Auto clears it', () => {
    const store = useSlippageStore.getState()
    store.setReceiveSettings(minimum('98.123456'))
    const minimumRevision = useSlippageStore.getState().revision
    for (let i = 0; i < 3; i++) {
        useSlippageStore.getState().resetMinimumForScope(scope)
        assert.deepEqual(receiveRequestParams(useSlippageStore.getState().receiveSettings), { min_receive_amount: '98.123456' })
        assert.equal(useSlippageStore.getState().revision, minimumRevision)
    }
    store.setSlippage(0.025)
    assert.deepEqual(receiveRequestParams(useSlippageStore.getState().receiveSettings), { slippage: '0.025' })
    assert.equal(useSlippageStore.getState().autoSlippage, false)
    store.clearSlippage()
    assert.deepEqual(receiveRequestParams(useSlippageStore.getState().receiveSettings), {})
    assert.equal(useSlippageStore.getState().autoSlippage, true)
    assert.ok(useSlippageStore.getState().revision > minimumRevision, 'returning to Auto must request a fresh quote')
})

test('amount, token, network and deposit-method changes reset the minimum before a new request', () => {
    for (const change of [{ amount: '101' }, { from: 'BASE_MAINNET' }, { fromCurrency: 'ETH' }, { to: 'BASE_MAINNET' }, { toCurrency: 'USDC' }, { depositMethod: 'deposit_address' }]) {
        const changedScope = receiveSettingsScope({ ...route, ...change })
        const changedRoute = { ...route, ...change }
        assert.deepEqual(resolveReceiveSettings(minimum('98'), changedScope, isTokenSwap(changedRoute.fromCurrency, changedRoute.toCurrency)), AUTO_RECEIVE_SETTINGS)
        useSlippageStore.getState().setReceiveSettings(minimum('98'))
        useSlippageStore.getState().resetMinimumForScope(changedScope)
        useSlippageStore.getState().resetMinimumForScope(scope)
        assert.deepEqual(useSlippageStore.getState().receiveSettings, AUTO_RECEIVE_SETTINGS, 'returning to the old pair must not revive its minimum')
    }
    assert.equal(receiveSettingsScope({ ...route, amount: '0100.000' }), scope)
    assert.equal(receiveSettingsScope({ ...route, amount: '.5' }), receiveSettingsScope({ ...route, amount: '0.5' }))
    assert.equal(receiveSettingsScope({ ...route, amount: 1e-7 }), receiveSettingsScope({ ...route, amount: '0.0000001' }))
    assert.equal(formReceiveSettingsScope({ amount: '100', from: { name: route.from }, fromAsset: { symbol: route.fromCurrency }, to: { name: route.to }, toAsset: { symbol: route.toCurrency }, depositMethod: 'wallet' }), scope)
})

test('manual slippage remains selected when amounts or tokens change', () => {
    useSlippageStore.getState().setSlippage(0.01)
    useSlippageStore.getState().resetMinimumForScope('different route')
    assert.deepEqual(receiveRequestParams(useSlippageStore.getState().receiveSettings), { slippage: '0.01' })
    useSlippageStore.getState().clearSlippage()
})

test('same-token transfers ignore minimum and slippage, including invalid saved input', () => {
    const sameTokenScope = receiveSettingsScope({ ...route, toCurrency: 'USDC' })
    assert.equal(isTokenSwap('USDC', 'USDC'), false)
    assert.equal(isTokenSwap('USDC', undefined), false)
    assert.equal(isTokenSwap(undefined, 'USDT'), false)
    assert.equal(isTokenSwap('USDC', 'USDT'), true)
    for (const settings of [minimum('98'), { ...minimum('98'), scope: sameTokenScope }, { mode: 'slippage', percent: '1' }, { mode: 'slippage', percent: '' }]) {
        const resolved = resolveReceiveSettings(settings, sameTokenScope, isTokenSwap('USDC', 'USDC'))
        assert.deepEqual(resolved, AUTO_RECEIVE_SETTINGS)
        assert.equal(receiveSettingsError(resolved), undefined)
        assert.deepEqual(receiveRequestParams(resolved), {})
    }
    const manual = { mode: 'slippage', percent: '1' }
    assert.deepEqual(receiveRequestParams(resolveReceiveSettings(manual, scope, isTokenSwap('USDC', 'USDT'))), { slippage: '0.01' })
})

test('minimum validation respects quote precision, including zero decimals and exact 18-decimal strings', () => {
    for (const amount of ['', '.', '0', '0.000000', '-1', 'NaN', 'Infinity', '1e-6', '1,23', ' 1 ', '1.2345678']) {
        assert.ok(receiveSettingsError(minimum(amount)), amount)
        assert.throws(() => receiveRequestParams(minimum(amount)))
    }
    for (const amount of ['0.000001', '98.123456', '98.123456000', '.5', '1.']) {
        assert.equal(receiveSettingsError(minimum(amount)), undefined, amount)
    }
    assert.equal(receiveSettingsError({ ...minimum('1'), precision: 0 }), undefined)
    assert.ok(receiveSettingsError({ ...minimum('1.1'), precision: 0 }))
    const exact = { ...minimum('0.123456789012345678'), precision: 18 }
    assert.deepEqual(receiveRequestParams(exact), { min_receive_amount: '0.123456789012345678' })
})

test('invalid slippage is blocked until edited or Auto is selected', () => {
    for (const percent of ['', '0', '0.09', '5.01', '-1', 'NaN', 'Infinity', '1e1']) {
        const selection = { mode: 'slippage', percent }
        assert.ok(receiveSettingsError(selection), percent)
        assert.throws(() => receiveRequestParams(selection))
    }
    for (const percent of ['0.1', '1', '5']) assert.equal(receiveSettingsError({ mode: 'slippage', percent }), undefined)
    assert.deepEqual(receiveRequestParams(AUTO_RECEIVE_SETTINGS), {})
})

test('quoted minimum input expands tiny token amounts without rounding the floor', () => {
    assert.equal(quotedMinimumInput(0.000000000000000001), '0.000000000000000001')
    assert.equal(quotedMinimumInput(9.975e-6), '0.000009975')
    assert.equal(quotedMinimumInput(1e21), '1000000000000000000000')
    assert.equal(quotedMinimumInput(98.123456), '98.123456')
    assert.equal(quotedMinimumInput(undefined), '')
})
