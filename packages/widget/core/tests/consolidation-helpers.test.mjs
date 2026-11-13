import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)

function loadSource(path, imports = {}) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', outputText)(name => {
    if (name in imports) return imports[name]
    throw new Error(`Unexpected ${path} dependency: ${name}`)
  }, module, module.exports)
  return module.exports
}

const swapPhase = loadSource('components/utils/swapPhase.ts')
const helpers = loadSource('helpers/consolidation.ts', {
  '@layerswap/widget-types': { NetworkType: { EVM: 'evm', Solana: 'solana' } },
  '@/lib/extendedRoutes/amounts': loadSource('lib/extendedRoutes/amounts.ts'),
  '@/lib/gases/resolveGasBalanceBudget': loadSource('lib/gases/resolveGasBalanceBudget.ts'),
  '@/components/utils/swapPhase': swapPhase,
})
const { SwapPhase } = swapPhase

const token = (symbol, extra = {}) => ({ symbol, asset: symbol, decimals: 6, status: 'active', ...extra })
const route = (name, tokens, extra = {}) => ({ name, display_name: name, type: 'evm', deposit_methods: ['wallet', 'deposit_address'], token: token('ETH'), tokens, ...extra })
const balances = (entries) => Object.fromEntries(Object.entries(entries).map(([network, tokens]) =>
  [network, { balances: Object.entries(tokens).map(([symbol, amount]) => ({ network, token: symbol, amount })) }]))

test('eligible sources are wallet-deposit EVM routes with a balance, excluding the primary, extended and provider-handled routes', () => {
  const routes = [
    route('BASE_MAINNET', [token('USDC'), token('ETH'), token('DAI')]),
    route('ARBITRUM_MAINNET', [token('USDC')]),
    route('SOLANA_MAINNET', [token('USDC')], { type: 'solana' }),
    route('DEPOSIT_ONLY', [token('USDC')], { deposit_methods: ['deposit_address'] }),
    route('HYPERLIQUID_MAINNET', [token('USDC')]),
    route('PROVIDER_NETWORK', [token('USDC')]),
  ]
  const held = balances({
    BASE_MAINNET: { USDC: 10, ETH: 0.5, DAI: 0 },
    ARBITRUM_MAINNET: { USDC: 3 },
    SOLANA_MAINNET: { USDC: 5 },
    DEPOSIT_ONLY: { USDC: 5 },
    HYPERLIQUID_MAINNET: { USDC: 5 },
    PROVIDER_NETWORK: { USDC: 5 },
  })
  const eligible = helpers.filterEligibleSources({
    routes,
    balances: held,
    primary: { network: 'BASE_MAINNET', token: 'USDC' },
    isExtended: name => name === 'HYPERLIQUID_MAINNET',
    hasWithdrawalProvider: r => r.name === 'PROVIDER_NETWORK',
  })
  assert.deepEqual(eligible.map(r => [r.name, r.tokens.map(t => t.symbol)]), [
    ['BASE_MAINNET', ['ETH']],
    ['ARBITRUM_MAINNET', ['USDC']],
  ])
  const withoutAdded = helpers.filterEligibleSources({
    routes, balances: held, primary: { network: 'BASE_MAINNET', token: 'USDC' }, excluded: ['ARBITRUM_MAINNET:USDC'],
    isExtended: () => false, hasWithdrawalProvider: () => false,
  })
  assert.equal(withoutAdded.some(r => r.name === 'ARBITRUM_MAINNET'), false)
})

test('the form is eligible only for a wallet EVM source with a complete destination and a connected account', () => {
  const base = {
    depositMethod: 'wallet', from: route('BASE_MAINNET', []), fromAsset: token('USDC'),
    to: route('ARBITRUM_MAINNET', []), toAsset: token('USDC'), destination_address: '0xabc',
  }
  assert.equal(helpers.isConsolidationEligibleForm(base, '0xsource'), true)
  assert.equal(helpers.isConsolidationEligibleForm(base, undefined), false)
  assert.equal(helpers.isConsolidationEligibleForm({ ...base, depositMethod: 'deposit_address' }, '0xsource'), false)
  assert.equal(helpers.isConsolidationEligibleForm({ ...base, from: route('SOLANA_MAINNET', [], { type: 'solana' }) }, '0xsource'), false)
  assert.equal(helpers.isConsolidationEligibleForm({ ...base, destination_address: undefined }, '0xsource'), false)
  assert.equal(helpers.isConsolidationEligibleForm({ ...base, fromExchange: { name: 'BINANCE' } }, '0xsource'), false)
})

test('leg form values are complete wallet deposits without refuel or presets', () => {
  const from = route('BASE_MAINNET', [])
  const to = route('ARBITRUM_MAINNET', [])
  const values = helpers.buildLegFormValues(
    { from, fromAsset: token('USDC'), amount: '12.5' },
    { to, toAsset: token('USDC'), destination_address: '0xabc' },
  )
  assert.deepEqual(values, {
    from, fromAsset: token('USDC'), amount: '12.5', to, toAsset: token('USDC'), destination_address: '0xabc',
    depositMethod: 'wallet', refuel: false, amountMode: 'fixed',
  })
})

test('quote totals are summed exactly at destination decimals', () => {
  const totals = helpers.aggregateConsolidationQuotes([
    { receiveAmount: 0.1, minReceiveAmount: 0.09, feesUsd: 0.5 },
    { receiveAmount: 0.2, minReceiveAmount: 0.19, feesUsd: 0.25 },
    { receiveAmount: 1.000001 },
  ], 6)
  assert.deepEqual(totals, { receive: '1.300001', minReceive: '1.280001', feesUsd: 0.75, gasUsd: 0 })
})

test('gas shortfall sums legs that share a network, counting an approval for ERC-20 legs and the amount of native legs', () => {
  const row = extra => ({ label: 'x', network: 'BASE_MAINNET', networkDisplayName: 'Base', nativeSymbol: 'ETH', loading: false, gas: { gas: 0.001 }, ...extra })
  const budget = 0.001 * 1.02
  const rows = [
    row({ amount: '5', isNative: false, nativeBalance: 0.008 }),
    row({ amount: '0.005', isNative: true, nativeBalance: 0.008 }),
    row({ network: 'ARBITRUM_MAINNET', networkDisplayName: 'Arbitrum', amount: '1', isNative: false, nativeBalance: 1 }),
  ]
  const shortfalls = helpers.resolveGasShortfalls(rows)
  assert.equal(shortfalls.length, 1)
  assert.equal(shortfalls[0].network, 'BASE_MAINNET')
  assert.ok(Math.abs(shortfalls[0].required - (budget * 2 + budget + 0.005)) < 1e-12)
  assert.equal(shortfalls[0].available, 0.008)

  assert.deepEqual(helpers.resolveGasShortfalls([row({ amount: '0.005', isNative: true, nativeBalance: 1 })]), [])
  assert.deepEqual(helpers.resolveGasShortfalls([row({ amount: '1', isNative: false, nativeBalance: undefined })]), [])
})

test('row issues follow the priority no route › balance › min/max, with an empty amount last-resort', () => {
  const base = { asset: 'USDT', network: 'Arbitrum', destinationLabel: 'USDC on Optimism', amount: '5', routeAvailable: true, balance: 10, minAmount: 1, maxAmount: 8 }
  assert.equal(helpers.resolveRowIssue(base), undefined)
  assert.deepEqual(helpers.resolveRowIssue({ ...base, routeAvailable: false, amount: '' }), { kind: 'no_route', badge: 'No route', message: 'No route for USDT on Arbitrum', detail: "Can't be sent to USDC on Optimism" })
  assert.equal(helpers.resolveRowIssue({ ...base, amount: '' }).message, 'Enter USDT amount')
  assert.equal(helpers.resolveRowIssue({ ...base, amount: '20' }).kind, 'balance')
  assert.deepEqual(helpers.resolveRowIssue({ ...base, amount: '0.5' }), { kind: 'min', badge: 'Below min', message: 'USDT amount below minimum', detail: 'Below min 1 USDT' })
  assert.equal(helpers.resolveRowIssue({ ...base, amount: '9' }).kind, 'max')
})

test('the summary flags every row on a network short of gas and totals only valid rows', () => {
  const row = (id, extra) => ({ id, asset: 'USDC', network: 'BASE_MAINNET', networkDisplayName: 'Base', nativeSymbol: 'ETH', amount: '1', isNative: false, loading: false, receiveAmount: 1, feesUsd: 0.5, gasUsd: 0.01, ...extra })
  const ready = helpers.summarizeConsolidation({ primary: row('primary'), a: row('a', { network: 'ARB', receiveAmount: 2 }) }, ['primary', 'a'], 6)
  assert.equal(ready.ready, true)
  assert.equal(ready.totals.receive, '3')
  assert.equal(helpers.summarizeConsolidation({ primary: row('primary') }, ['primary', 'a'], 6).ready, false)

  const below = helpers.summarizeConsolidation({ primary: row('primary'), a: row('a', { issue: { kind: 'min', message: 'USDC amount below minimum' } }) }, ['primary', 'a'], 6)
  assert.equal(below.firstError, 'USDC amount below minimum')
  assert.deepEqual(below.validRows.map(r => r.id), ['primary'])
  assert.equal(below.totals.receive, '1')

  const gas = { gas: 0.001 }
  const short = helpers.summarizeConsolidation({ primary: row('primary', { gas, nativeBalance: 0.001 }), a: row('a', { gas, nativeBalance: 0.001 }) }, ['primary', 'a'], 6)
  assert.equal(short.issues.primary.kind, 'gas')
  assert.equal(short.issues.a.kind, 'gas')
  assert.equal(short.gasShortfalls[0].transfers, 2)
  assert.equal(short.firstError, 'Not enough ETH on Base for gas')
  assert.equal(helpers.summarizeConsolidation({}, ['primary'], 6).active, false)
})

test('sources are sent grouped by network, keeping first-seen order', () => {
  const items = [{ id: 1, network: 'BASE' }, { id: 2, network: 'ARB' }, { id: 3, network: 'BASE' }]
  assert.deepEqual(helpers.orderByNetwork(items).map(i => i.id), [1, 3, 2])
})

test('a record lists the primary source first and groups the rest by network', () => {
  const values = {
    from: route('BASE_MAINNET', []), fromAsset: token('USDC'), amount: '10',
    to: route('ARBITRUM_MAINNET', []), toAsset: token('USDC'), destination_address: '0xdest',
    extraSources: [
      { id: 'OPTIMISM_MAINNET:USDC', from: route('OPTIMISM_MAINNET', []), fromAsset: token('USDC'), amount: '4' },
      { id: 'BASE_MAINNET:DAI', from: route('BASE_MAINNET', []), fromAsset: token('DAI'), amount: '2' },
    ],
  }
  const record = helpers.buildRecordFromForm(values, '0xsource', 'r1', 100)
  assert.deepEqual(record, {
    id: 'r1', createdAt: 100, status: 'executing', sourceAddress: '0xsource', stopped: false, activeLegId: 'BASE_MAINNET:USDC',
    destination: { network: 'ARBITRUM_MAINNET', token: 'USDC', address: '0xdest' },
    legs: [
      { id: 'BASE_MAINNET:USDC', network: 'BASE_MAINNET', token: 'USDC', amount: '10', state: 'pending' },
      { id: 'BASE_MAINNET:DAI', network: 'BASE_MAINNET', token: 'DAI', amount: '2', state: 'pending' },
      { id: 'OPTIMISM_MAINNET:USDC', network: 'OPTIMISM_MAINNET', token: 'USDC', amount: '4', state: 'pending' },
    ],
  })
  assert.equal(helpers.buildRecordFromForm({ ...values, amount: '' }, '0xsource', 'r1', 100), undefined)
})

test('leg routes rehydrate by network name and token symbol', () => {
  const routes = [route('BASE_MAINNET', [token('USDC')])]
  assert.equal(helpers.rehydrateLeg({ network: 'BASE_MAINNET', token: 'USDC' }, routes).fromAsset.symbol, 'USDC')
  assert.equal(helpers.rehydrateLeg({ network: 'BASE_MAINNET', token: 'DAI' }, routes), undefined)
  assert.equal(helpers.rehydrateLeg({ network: 'GONE', token: 'USDC' }, routes), undefined)
})

test('the next active leg is the first pending one that can run', () => {
  const legs = [{ id: 'a', state: 'submitted' }, { id: 'b', state: 'cancelled' }, { id: 'c', state: 'pending' }, { id: 'd', state: 'pending' }]
  assert.equal(helpers.nextActiveLeg(legs), 'c')
  assert.equal(helpers.nextActiveLeg(legs, leg => leg.id !== 'c'), 'd')
  assert.equal(helpers.nextActiveLeg(legs.slice(0, 2)), undefined)
})

test('leg status prefers the observed swap outcome over the queue state', () => {
  const status = input => helpers.deriveLegStatus({ active: false, available: true, submitted: false, ...input })
  assert.equal(status({ leg: { state: 'pending' } }), 'queued')
  assert.equal(status({ leg: { state: 'pending' }, active: true }), 'awaiting_confirmation')
  assert.equal(status({ leg: { state: 'pending' }, available: false }), 'unavailable')
  assert.equal(status({ leg: { state: 'cancelled' } }), 'stopped')
  assert.equal(status({ leg: { state: 'cancelled' }, submitted: true, phase: SwapPhase.InputPending }), 'submitted')
  assert.equal(status({ leg: { state: 'submitted' } }), 'submitted')
  assert.equal(status({ leg: { state: 'submitted' }, phase: SwapPhase.Completed }), 'delivered')
  assert.equal(status({ leg: { state: 'submitted' }, phase: SwapPhase.Refunded }), 'refunded')
  assert.equal(status({ leg: { state: 'submitted' }, phase: SwapPhase.Failed }), 'failed')
  assert.equal(status({ leg: { state: 'submitted', outcome: 'delivered' } }), 'delivered')
})
