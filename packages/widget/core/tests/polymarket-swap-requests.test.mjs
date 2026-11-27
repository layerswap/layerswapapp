import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { loadSource } from './helpers/source.mjs'

const require = createRequire(import.meta.url)
const types = require('@layerswap/widget-types')
const utils = { KnownInternalNames: require('@layerswap/utils/known-ids').default }
const providerSource = '../../../wallets/adapters/evm/src/additionalProviders/polymarket/'
const constants = loadSource(`${providerSource}constants.ts`, {
    '@layerswap/utils': utils,
    './protocol': loadSource(`${providerSource}protocol.ts`),
})
const { polymarketProvider } = loadSource(`${providerSource}polymarketExtendedRouteProvider.ts`, {
    '@layerswap/widget-types': types,
    './constants': constants,
    './routes': loadSource(`${providerSource}routes.ts`, { './constants': constants }),
})
const amounts = loadSource('lib/extendedRoutes/amounts.ts')
const registry = loadSource('lib/extendedRoutes/registry.ts', { '@layerswap/widget-types': types, './amounts': amounts })
registry.setExtendedRouteProviders([polymarketProvider])
const swapFlow = loadSource('helpers/swapFlow.ts', { '@/lib/extendedRoutes/registry': registry })
const transforms = loadSource('lib/extendedRoutes/transforms.ts', {
    '@layerswap/widget-types': types,
    '@/components/utils/formatTime': loadSource('components/utils/formatTime.ts'),
    './amounts': amounts,
})
const shared = {
    '@layerswap/widget-types': types,
    '@layerswap/utils': utils,
    '@/lib/extendedRoutes/registry': registry,
    '@/lib/extendedRoutes/transforms': transforms,
    '@/lib/extendedRoutes/amounts': amounts,
    '@/helpers/swapFlow': swapFlow,
}

const owner = '0x1111111111111111111111111111111111111111'
const destination = '0x2222222222222222222222222222222222222222'
const token = { symbol: 'USDC', decimals: 6, status: 'active', price_in_usd: 1 }
const polygon = { name: 'POLYGON_MAINNET', deposit_methods: ['wallet'], tokens: [token, { ...token, symbol: 'USDC.e' }] }
const polymarket = polymarketProvider.resolveExtendedNetwork('POLYMARKET_MAINNET', [polygon])
const target = { name: 'BASE_MAINNET' }
const plan = registry.resolveExtendedRoutePlan({
    sourceNetworkName: polymarket.name, sourceTokenSymbol: 'pUSD',
    destinationNetworkName: target.name, destinationTokenSymbol: 'USDC',
    sourceAmount: '10', availableRoutes: [polygon],
})
assert.ok(plan)
const values = {
    from: polymarket, fromAsset: polymarket.tokens[0], to: target, toAsset: token,
    amount: '10', depositMethod: 'wallet', destination_address: destination,
}
function apiHarness() {
    const requests = []
    const transport = async (url, options) => {
        requests.push({ url, ...options, data: options.data && JSON.parse(JSON.stringify(options.data)) })
        return { data: {} }
    }
    const { default: Client } = loadSource('lib/apiClients/layerSwapApiClient.ts', {
        '@layerswap/widget-types': types,
        '../AppSettings': { default: { LayerswapApiUri: 'https://api.test', LayerswapApiKeys: { mainnet: 'test' } } },
        '../axiosInterceptor': { InitializeAuthInstance: () => transport, InitializeUnauthInstance: () => transport },
        uuid: { v4: () => 'test-correlation-id' },
        '../Errors/AuthRefreshFailedError': { AuthRefreshFailedError: class extends Error {} },
        '@/lib/ErrorHandler': { ErrorHandler: error => assert.fail(String(error)) },
        '../widgetTelemetry': { startApiOperation: () => () => {} },
        '../atomicBatchActions': {},
    })
    return { client: new Client(), requests }
}

test('Polymarket creation sends the owner as the refund address without a source address', async () => {
    const { client, requests } = apiHarness()
    await client.CreateSwapAsync(transforms.buildCreateSwapParamsForExtendedRoute({
        plan, destinationNetworkName: target.name, destinationTokenSymbol: 'USDC',
        destinationAddress: destination, sourceAddress: owner,
        // The provider must override even an older caller opting into frontend execution.
        useFrontendSwap: true,
    }))
    const body = requests[0].data
    assert.equal(body.source_network, 'POLYGON_MAINNET')
    assert.equal(body.source_token, 'USDC.e')
    assert.equal(body.amount, '10')
    assert.equal(body.destination_address, destination)
    assert.equal(body.use_frontend_swap, false)
    assert.equal(Object.hasOwn(body, 'use_depository'), false)
    assert.equal(body.use_deposit_address, false)
    assert.equal(body.use_gasless, false)
    assert.equal(Object.hasOwn(body, 'source_address'), false)
    assert.equal(body.refund_address, owner)
})

test('ordinary wallet creation defaults to frontend execution and retains source and refund addresses', async () => {
    const { client, requests } = apiHarness()
    await client.CreateSwapAsync({
        source_network: polygon.name, source_token: 'USDC.e', amount: '10',
        destination_network: target.name, destination_token: 'USDC', destination_address: destination,
        source_address: owner, refund_address: owner,
    })
    assert.equal(requests[0].data.use_frontend_swap, true)
    assert.equal(requests[0].data.source_address, owner)
    assert.equal(requests[0].data.refund_address, owner)
})

test('route discovery preserves the provider execution policy after mapping to Polygon', () => {
    const { resolveNetworkRoutesURL } = loadSource('helpers/routes.ts', {
        ...shared,
        '@/lib/AppSettings': { default: { AvailableSourceNetworkTypes: { all: true } } },
    })
    for (const direction of ['from', 'to']) {
        const params = new URL(resolveNetworkRoutesURL(direction, values), 'https://api.test').searchParams
        assert.equal(params.get('use_frontend_swap'), 'false')
        if (direction === 'to') assert.equal(params.get('source_network'), polygon.name)
    }
})

test('API route discovery preserves explicit opt-outs and its existing default', async () => {
    const { client, requests } = apiHarness()
    await client.GetRoutesAsync('sources', false)
    await client.GetRoutesAsync('sources')
    assert.equal(new URL(requests[0].url).searchParams.get('use_frontend_swap'), 'false')
    assert.equal(new URL(requests[1].url).searchParams.get('use_frontend_swap'), 'true')
})

function feeHarness(requests = []) {
    return loadSource('hooks/useFee.tsx', {
        ...shared,
        react: React, zustand: require('zustand'),
        swr: { default: url => { if (url) requests.push(url); return {} }, useSWRConfig: () => ({ cache: new Map() }) },
        '@/components/utils/numbers': {},
        '@/stores/slippageStore': { useSlippageStore: () => ({}) },
        '@/context/settings': { useSettingsState: () => ({ networks: [polygon, polymarket], sourceRoutes: [polygon] }) },
        '@/lib/apiClients': { LayerswapApiClient: class {} },
        // Even a connector advertising direct source support must not leak the owner address.
        '@/context/swapAccounts': { useSelectedAccount: () => ({ address: owner, walletAsSourceSupportedNetworks: [polymarket.name, polygon.name] }) },
        '@/stores/gaslessPreferenceStore': { useGaslessPreferenceStore: selector => selector({ gaslessEnabled: false }) },
        '@/helpers/gasless': { isGaslessCapableRoute: () => false },
        '@/lib/address/Address': {},
    })
}
for (const source of [polymarket, polygon]) {
    test(`${source.name}: the quote hook keeps quote and limits execution modes consistent`, () => {
        const requests = []
        const { useQuoteData } = feeHarness(requests)
        function Probe() {
            useQuoteData({ from: source.name, fromCurrency: source === polymarket ? 'pUSD' : 'USDC.e',
                to: target.name, toCurrency: 'USDC', amount: '10', depositMethod: 'wallet', destinationAddress: destination })
            return null
        }
        renderToString(React.createElement(Probe))
        for (const path of ['/quote', '/limits']) {
            const url = requests.find(url => url.startsWith(`${path}?`))
            assert.ok(url, `${path} was requested`)
            const params = new URL(url, 'https://api.test').searchParams
            assert.equal(params.get('source_network'), polygon.name)
            assert.equal(params.get('source_token'), 'USDC.e')
            assert.equal(params.get('use_frontend_swap'), String(source !== polymarket))
            if (path === '/quote') assert.equal(params.get('source_address'), source === polymarket ? null : owner)
        }
    })
}

test('live amount confirmation refreshes Polymarket limits without opting into frontend swaps', async () => {
    let requestedUrl
    const { startPresetPreparation } = loadSource('lib/preparePresetAmount.ts', {
        ...shared,
        '@/hooks/useFee': feeHarness(),
        './apiClients/layerSwapApiClient': { default: class { async fetcher(url) {
            requestedUrl = url
            return { data: { min_amount: 1, max_amount: 100 } }
        } } },
        './extendedRoutes/registry': registry,
        './extendedRoutes/transforms': transforms,
        '@/stores/balanceStore': { useBalanceStore: { getState: () => ({ fetchBalance: async () => ({ balances: [] }) }) } },
        './resolvers/resolverService': {},
        './amountPresets': {
            isWalletAmountFlow: () => true, isAmountPreset: () => true, supportsLiveAmountPreset: () => true,
            calculatePresetAmount: async () => '10',
        },
    })
    const preparation = await startPresetPreparation({ ...values, amountMode: 'max' }, owner, {}, [polygon], false)
    assert.equal(await preparation.calculate(), '10')
    const params = new URL(requestedUrl, 'https://api.test').searchParams
    assert.equal(params.get('source_network'), polygon.name)
    assert.equal(params.get('use_frontend_swap'), 'false')
    assert.equal(params.has('source_address'), false)
})
