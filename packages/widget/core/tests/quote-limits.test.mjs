import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)

function loadSource(path, imports = {}) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', outputText)(name => {
    if (['react', 'react/jsx-runtime', 'swr', 'zustand'].includes(name)) return require(name)
    if (name in imports) return imports[name]
    throw new Error(`Unexpected dependency: ${name}`)
  }, module, module.exports)
  return module.exports
}

function harness() {
  const requests = []
  // Exercise the real handler, getLimits and URL builder. Only the HTTP boundary
  // and dependencies used by the unrelated quote hook are replaced.
  const fees = loadSource('../src/hooks/useFee.tsx', {
    '@/components/utils/numbers': {},
    '@/stores/slippageStore': {},
    '@layerswap/utils': {},
    '@/context/settings': {},
    '@/lib/extendedRoutes/registry': {},
    '@layerswap/widget-types': {},
    '@/lib/extendedRoutes/transforms': {},
    '@/lib/extendedRoutes/amounts': {},
    '@/context/swapAccounts': {},
    '@/stores/gaslessPreferenceStore': {},
    '@/helpers/gasless': {},
    '@/helpers/swapFlow': {},
    '@/lib/address/Address': { Address: { isValid: () => true } },
    '@/lib/apiClients': {
      LayerswapApiClient: class {
        async fetcher(url) {
          const params = new URL(url, 'https://api.test').searchParams
          requests.push(params)
          return { data: params.get('use_gasless') === 'true'
            ? { min_amount: 10, max_amount: 100 }
            : { min_amount: 20, max_amount: 200 } }
        }
      },
    },
  })
  const { handleLimitsUpdate } = loadSource('../src/components/Pages/Swap/Withdraw/QuoteUpdate.tsx', {
    '@/helpers/swapFlow': loadSource('../src/helpers/swapFlow.ts'),
    '@/hooks/useFee': fees,
    './Presentation/QuoteUpdatedView': { QuoteUpdated: () => null },
  })
  return { handleLimitsUpdate, requests }
}

const valuesFor = (amount, depositMethod = 'wallet') => ({
  amount,
  from: { name: 'BASE_MAINNET' },
  fromAsset: { symbol: 'USDC' },
  to: { name: 'ARBITRUM_MAINNET' },
  toAsset: { symbol: 'USDC' },
  destination_address: 'destination',
  depositMethod,
})

for (const scenario of [
  { name: 'valid gasless amount below the standard minimum', useGasless: true, amount: '15', expected: '15' },
  { name: 'gasless minimum adjustment', useGasless: true, amount: '5', expected: '10' },
  { name: 'gasless maximum adjustment below the standard maximum', useGasless: true, amount: '150', expected: '100' },
  { name: 'standard minimum adjustment', useGasless: false, amount: '15', expected: '20' },
  { name: 'valid standard amount above the gasless maximum', useGasless: false, amount: '150', expected: '150' },
  { name: 'manual deposit minimum adjustment', useGasless: false, depositMethod: 'deposit_address', amount: '15', expected: '20' },
]) {
  test(`limit recheck uses the requested execution mode for ${scenario.name}`, async () => {
    const { handleLimitsUpdate, requests } = harness()
    const swapValues = valuesFor(scenario.amount, scenario.depositMethod)
    const confirmations = []
    await handleLimitsUpdate({
      swapValues,
      useGasless: scenario.useGasless,
      getConfirmation: async options => { confirmations.push(options); return true },
    })

    assert.equal(requests.length, 1)
    assert.equal(requests[0].get('use_gasless'), String(scenario.useGasless))
    assert.equal(requests[0].get('use_frontend_swap'), 'true')
    assert.equal(requests[0].get('use_deposit_address'), String(swapValues.depositMethod === 'deposit_address'))
    assert.equal(swapValues.amount, scenario.expected)
    assert.equal(confirmations.length, Number(scenario.amount !== scenario.expected))
    if (confirmations.length) {
      assert.equal(confirmations[0].content.props.minAllowedAmount, scenario.useGasless ? 10 : 20)
      assert.equal(confirmations[0].content.props.maxAllowedAmount, scenario.useGasless ? 100 : 200)
    }
  })
}

test('cancelling a gasless limit adjustment preserves the requested amount', async () => {
  const { handleLimitsUpdate } = harness()
  const swapValues = valuesFor('150')
  await assert.rejects(handleLimitsUpdate({
    swapValues,
    useGasless: true,
    getConfirmation: async () => false,
  }), /User cancelled the operation/)
  assert.equal(swapValues.amount, '150')
})
