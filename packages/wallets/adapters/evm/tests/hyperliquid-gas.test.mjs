import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { NetworkType } from '@layerswap/widget-types'

// Load source with isolated wallet services, as in withdrawal-submission.test.mjs.
function load(path, imports) {
    const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', outputText)(name => {
        assert.ok(name in imports, `Unexpected dependency: ${name}`)
        return imports[name]
    }, module, module.exports)
    return module.exports
}
const { LazyGasProvider, LazyBalanceProvider } = load('../../../../widget/types/src/resolvers/lazyProviders.ts', { './balance': { BalanceProvider: class {} } })
const gasModule = load('../src/additionalProviders/hyperliquid/hyperliquidGasProvider.ts', {
    '@layerswap/widget-types': { NetworkType },
    './constants': { HYPERLIQUID_USDC_SYMBOL: 'USDC', HYPERLIQUID_WITHDRAW_HEADROOM: 0.01 },
})
const { createEVMProvider } = load('../src/extendedRoutes.ts', {
    '@layerswap/widget-types': { NetworkType, LazyGasProvider, LazyBalanceProvider },
    '@layerswap/utils': { KnownInternalNames: { Networks: {} } },
    './generic': { createEVMProvider: () => ({ balanceProvider: [], gasProvider: [] }) },
    './additionalProviders/hyperliquid/createHyperliquidTransferProvider': {},
    './additionalProviders/hyperliquid/hyperliquidExtendedRouteProvider': {},
    './additionalProviders/hyperliquid/routes': { HYPERLIQUID_ROUTES: {} },
    './additionalProviders/polymarket/createPolymarketTransferProvider': {},
    './additionalProviders/polymarket/constants': { POLYMARKET_CONFIG: {} },
    './additionalProviders/polymarket/polymarketExtendedRouteProvider': {},
    './additionalProviders/polymarket/withdrawal': {},
    './service/getEvmConfig': {},
    './additionalProviders/hyperliquid/hyperliquidGasProvider': gasModule,
})

test('Hyperliquid fee resolution works without native token metadata', async () => {
    const provider = createEVMProvider()
    const network = { name: 'HYPERLIQUID_MAINNET', type: NetworkType.Hyperliquid }
    const token = { symbol: 'USDC', decimals: 6 }
    const gasProvider = provider.gasProvider.find(p => p?.supportsNetwork(network))
    assert.ok(gasProvider, 'the preset fee resolver must find a provider')
    for (const amount of [0.536843, 1, 5.99]) {
        const gas = await gasProvider.getGas({ network, token, address: '0x0000000000000000000000000000000000000001', amount })
        assert.equal(gas.gas, 0.01)
        assert.equal(gas.token, token)
    }
})
