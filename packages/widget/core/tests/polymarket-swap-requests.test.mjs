import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const repository = new URL('../../../../', import.meta.url)
const shared = {}
function loadSource(path, imports = {}) {
    const url = new URL(path, repository)
    const output = ts.transpileModule(readFileSync(url, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText
    const module = { exports: {} }
    new Function('require', 'module', 'exports', output)(name => {
        if (name in imports) return imports[name]
        if (name in shared) return shared[name]
        if (name.startsWith('.')) {
            const dependency = new URL(`${name}.ts`, url)
            if (existsSync(dependency)) return loadSource(dependency.href, imports)
        }
        throw new Error(`Unexpected ${path} dependency: ${name}`)
    }, module, module.exports)
    return module.exports
}
const core = 'packages/widget/core/src/'
const types = {
    ...loadSource('packages/widget/types/src/resolvers/extendedRoutes.ts'),
    ...loadSource('packages/widget/types/src/extendedRouteAvailability.ts'),
    ...loadSource('packages/widget/types/src/network.ts'),
}
shared['@layerswap/widget-types'] = types
shared['@layerswap/utils'] = { KnownInternalNames: loadSource('packages/utils/src/knownIds.ts').default }
shared['@/components/utils/formatTime'] = loadSource(`${core}components/utils/formatTime.ts`)
const { polymarketProvider } = loadSource('packages/wallets/adapters/evm/src/additionalProviders/polymarket/polymarketExtendedRouteProvider.ts')
const registry = loadSource(`${core}lib/extendedRoutes/registry.ts`)
registry.setExtendedRouteProviders([polymarketProvider])
shared['@/lib/extendedRoutes/registry'] = registry
const swapFlow = loadSource(`${core}helpers/swapFlow.ts`)
shared['@/helpers/swapFlow'] = swapFlow
const transforms = loadSource(`${core}lib/extendedRoutes/transforms.ts`)
shared['@/lib/extendedRoutes/transforms'] = transforms
shared['@/lib/extendedRoutes/amounts'] = loadSource(`${core}lib/extendedRoutes/amounts.ts`)

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
function createParams(useFrontendSwap) {
    return transforms.buildCreateSwapParamsForExtendedRoute({
        plan, destinationNetworkName: target.name, destinationTokenSymbol: 'USDC',
        destinationAddress: destination, sourceAddress: owner, useFrontendSwap,
    })
}
function apiHarness() {
    const requests = []
    const transport = async (url, options) => {
        requests.push({ url, ...options, data: options.data && JSON.parse(JSON.stringify(options.data)) })
        return { data: {} }
    }
    const { default: Client } = loadSource(`${core}lib/apiClients/layerSwapApiClient.ts`, {
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

test('Polymarket creation sends an addressless depository request through the real API client', async () => {
    const { client, requests } = apiHarness()
    await client.CreateSwapAsync(createParams(swapFlow.wantsFrontendSwap({ sourceNetwork: polymarket.name })))
    const body = requests[0].data
    assert.equal(body.source_network, 'POLYGON_MAINNET')
    assert.equal(body.source_token, 'USDC.e')
    assert.equal(body.amount, '10')
    assert.equal(body.destination_address, destination)
    assert.equal(body.use_frontend_swap, false)
    assert.equal(body.use_depository, true)
    assert.equal(body.use_deposit_address, false)
    assert.equal(body.use_gasless, false)
    assert.equal(Object.hasOwn(body, 'source_address'), false)
    assert.equal(Object.hasOwn(body, 'refund_address'), false)
})

test('the Polymarket provider cannot be opted into frontend execution by an older caller', () => {
    assert.equal(createParams(true).use_frontend_swap, false)
})

test('ordinary wallet swaps retain frontend execution and their source and refund addresses', async () => {
    const { client, requests } = apiHarness()
    const useFrontendSwap = swapFlow.wantsFrontendSwap({ sourceNetwork: polygon.name })
    await client.CreateSwapAsync({
        ...createParams(false), use_frontend_swap: useFrontendSwap,
        source_address: owner, refund_address: owner,
    })
    assert.equal(useFrontendSwap, true)
    assert.equal(requests[0].data.use_frontend_swap, true)
    assert.equal(requests[0].data.source_address, owner)
    assert.equal(requests[0].data.refund_address, owner)
})

test('route discovery preserves the provider execution policy after mapping to Polygon', () => {
    const { resolveNetworkRoutesURL } = loadSource(`${core}helpers/routes.ts`, {
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

const dom = new JSDOM('<div id="root"></div>')
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
function feeHarness(requests = []) {
    return loadSource(`${core}hooks/useFee.tsx`, {
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
    test(`${source.name}: the quote hook keeps quote and limits execution modes consistent`, async () => {
        const requests = []
        const { useQuoteData } = feeHarness(requests)
        function Probe() {
            useQuoteData({ from: source.name, fromCurrency: source === polymarket ? 'pUSD' : 'USDC.e',
                to: target.name, toCurrency: 'USDC', amount: '10', depositMethod: 'wallet', destinationAddress: destination })
            return null
        }
        const root = createRoot(document.getElementById('root'))
        try {
            await act(() => root.render(React.createElement(Probe)))
            for (const path of ['/quote', '/limits']) {
                const url = requests.find(url => url.startsWith(`${path}?`))
                assert.ok(url, `${path} was requested`)
                const params = new URL(url, 'https://api.test').searchParams
                assert.equal(params.get('source_network'), polygon.name)
                assert.equal(params.get('source_token'), 'USDC.e')
                assert.equal(params.get('use_frontend_swap'), String(source !== polymarket))
                if (path === '/quote') assert.equal(params.get('source_address'), source === polymarket ? null : owner)
            }
        } finally {
            await act(() => root.unmount())
        }
    })
}

test('live amount confirmation refreshes Polymarket limits without opting into frontend swaps', async () => {
    let requestedUrl
    const { preparePresetAmount } = loadSource(`${core}lib/preparePresetAmount.ts`, {
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
    assert.equal(await preparePresetAmount({ ...values, amountMode: 'max' }, owner, {}, [polygon], false), '10')
    const params = new URL(requestedUrl, 'https://api.test').searchParams
    assert.equal(params.get('source_network'), polygon.name)
    assert.equal(params.get('use_frontend_swap'), 'false')
    assert.equal(params.has('source_address'), false)
})
