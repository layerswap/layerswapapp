import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { loadSource } from './helpers/source.mjs'
import { createPresetPreparation } from './helpers/preset-preparation.mjs'

const require = createRequire(import.meta.url)

const token = { symbol: 'ETH', decimals: 6 }
const network = { name: 'ETHEREUM_MAINNET', token }
const values = { amount: '0.95', from: network, fromAsset: token, to: { name: 'BASE_MAINNET' },
  toAsset: token, destination_address: 'destination', depositMethod: 'wallet', refuel: false }
const setup = options => createPresetPreparation({ token, ...options })

test('a preparation recalculates from the same balance and limits with another fee source', async () => {
  const { startPresetPreparation, calls } = setup({ gas: 0.1 })
  const preparation = await startPresetPreparation({ ...values, amount: '0.898' }, 'source', {}, [], false)
  const reads = () => calls.filter(([name]) => name === 'balance' || name === 'limits').length
  assert.equal(reads(), 2)
  assert.equal(await preparation.calculate(), '0.898', 'the live estimate keeps the reviewed amount')
  const depositFee = { gas: 0.12, token }
  assert.equal(await preparation.calculate(undefined, async () => depositFee), '0.8776', 'the deposit fee lowers it without another read')
  assert.equal(reads(), 2)
  assert.equal(calls.filter(([name]) => name === 'gas').length, 1, 'a supplied fee replaces the live estimate')
  assert.equal(await preparation.calculate({ gas: 0.11, token }, async () => ({ gas: 0.05, token })), '0.8878', 'the floor still raises a smaller supplied fee')
  assert.equal(await preparation.calculate({ gas: 0.2, token }), '0.796', 'the floor also raises the live estimate')
})

test('creation preparation bypasses cached balances, refreshes matching limits and estimates the payable amount', async () => {
  const { preparePresetAmount, calls } = setup()
  const wallet = { id: 'wallet' }
  const amount = await preparePresetAmount(values, 'source', wallet, [], false)
  assert.equal(amount, '0.898')
  assert.deepEqual(calls.find(([name]) => name === 'balance'), ['balance', 'source', network.name, { ignoreCache: true }])
  const limits = calls.find(([name]) => name === 'limits')[1]
  assert.equal(limits.sourceNetwork, network.name)
  assert.equal(limits.destinationAddress, 'destination')
  assert.equal(limits.useGasless, false)
  const probes = calls.filter(([name]) => name === 'gas').map(([, args]) => args)
  assert.deepEqual(probes.map(args => args.amount), [0.95, 0.898])
  assert.equal(probes[0].wallet, wallet)
})

test('creation preparation respects fresh route caps and refuses amounts below the minimum', async () => {
  const capped = setup({ limits: { min_amount: 0.1, max_amount: 0.5 } })
  assert.equal(await capped.preparePresetAmount(values, 'source', {}, [], false), '0.5')
  const tooSmall = setup({ balance: 0.01 })
  await assert.rejects(tooSmall.preparePresetAmount(values, 'source', {}, [], false), /below the minimum/)
})

test('a failed real balance-store refresh can be retried instead of reusing its rejected promise', async () => {
  let attempts = 0
  const refreshed = { balances: [{ amount: 1, token: token.symbol, network: network.name }] }
  const { useBalanceStore } = loadSource('stores/balanceStore.ts', {
    zustand: require('zustand'), 'zustand/middleware': require('zustand/middleware'),
    '../lib/resolvers/resolverService': { resolverService: { getBalanceResolver: () => ({ getBalance: async () => {
      if (++attempts === 1) throw new Error('temporary RPC failure')
      return refreshed
    } }) } },
  })
  await assert.rejects(useBalanceStore.getState().fetchBalance('source', network, { ignoreCache: true }), /temporary RPC/)
  const retry = await useBalanceStore.getState().fetchBalance('source', network, { ignoreCache: true })
  assert.equal(retry, refreshed)
  assert.equal(attempts, 2)
})

for (const { name, gas, reviewed, expected, gasReads } of [
  { name: 'lowers the reviewed amount when a small fee increase consumes its buffer', gas: 0.10001, reviewed: '0.898', expected: '0.897989', gasReads: 2 },
  { name: 'lowers the reviewed amount when the fresh fee exceeds the reserve', gas: 0.12, reviewed: '0.898', expected: '0.8776', gasReads: 2 },
  { name: 'preserves a reviewed amount that covers the buffered fee', gas: 0.10001, reviewed: '0.897', expected: '0.897', gasReads: 1 },
]) {
  test(`confirmation ${name}`, async () => {
    const { preparePresetAmount, calls } = setup({ gas })
    const amount = await preparePresetAmount({ ...values, amount: reviewed }, 'source', {}, [], false)
    assert.equal(amount, expected)
    assert.equal(calls.filter(([name]) => name === 'gas').length, gasReads)
  })
}

for (const { name, options, expected } of [
  { name: 'preserves a fundable amount after the balance decreases', options: { balance: 0.8, gas: 0.1 }, expected: '0.449' },
  { name: 'preserves the reviewed amount after the balance increases', options: { balance: 2, gas: 0.01 }, expected: '0.449' },
  { name: 'replaces an unfundable amount with Half of the payable balance', options: { balance: 0.5, gas: 0.1 }, expected: '0.199' },
  { name: 'replaces an amount above the route cap with Half of the cap', options: { limits: { min_amount: 0.1, max_amount: 0.4 } }, expected: '0.2' },
]) {
  test(`Half confirmation ${name}`, async () => {
    const { preparePresetAmount } = setup(options)
    const amount = await preparePresetAmount({ ...values, amountMode: 'half', amount: '0.449' }, 'source', {}, [], false)
    assert.equal(amount, expected)
  })
}

for (const mode of ['half', 'max']) {
  test(`${mode} confirmation refuses a reviewed amount below a refreshed route minimum`, async () => {
    const raised = setup({ limits: { min_amount: 0.5, max_amount: 2 } })
    await assert.rejects(raised.preparePresetAmount({ ...values, amountMode: mode, amount: '0.449' }, 'source', {}, [], false), /minimum swap amount increased/)
  })
}

test('Min preparation returns a new required minimum for review and rejects an unfundable minimum', async () => {
  const raised = setup({ limits: { min_amount: 0.2, max_amount: 2 } })
  assert.equal(await raised.preparePresetAmount({ ...values, amountMode: 'min', amount: '0.1' }, 'source', {}, [], false), '0.2')
  const lowered = setup({ limits: { min_amount: 0.05, max_amount: 2 } })
  assert.equal(await lowered.preparePresetAmount({ ...values, amountMode: 'min', amount: '0.1' }, 'source', {}, [], false), '0.1')
  const insufficient = setup({ balance: 0.15, limits: { min_amount: 0.2, max_amount: 2 } })
  await assert.rejects(insufficient.preparePresetAmount({ ...values, amountMode: 'min', amount: '0.1' }, 'source', {}, [], false), /Insufficient ETH balance/)
})

for (const { name, flow } of [
  { name: 'deposit address', flow: { depositMethod: 'deposit_address' } },
  { name: 'exchange deposit', flow: { depositMethod: 'deposit_address', fromExchange: { name: 'exchange' } } },
  { name: 'exchange source with a wallet deposit method', flow: { depositMethod: 'wallet', fromExchange: { name: 'exchange' } } },
  { name: 'no deposit method', flow: { depositMethod: undefined } },
]) {
  test(`${name}: preparation preserves the submitted amount without live reads`, async () => {
    const { preparePresetAmount, calls } = setup({ limits: { min_amount: 1, max_amount: 2 } })
    assert.equal(await preparePresetAmount({ ...values, ...flow, amountMode: 'max' }, undefined, undefined, [], false), values.amount)
    assert.deepEqual(calls, [])
  })
}

test('fresh confirmation limits reach the live cache before the revised amount returns', async () => {
  const limits = { min_amount: 0.2, max_amount: 2 }
  const { preparePresetAmount } = setup({ limits })
  let published
  const amount = await preparePresetAmount({ ...values, amountMode: 'min', amount: '0.1' }, 'source', {}, [], false,
    async (key, response) => { published = { key, response } })
  assert.equal(amount, '0.2')
  assert.deepEqual(published, { key: 'limits', response: { data: limits } })
})

for (const [name, symbol] of [['TON_MAINNET', 'TON'], ['PARADEX_MAINNET', 'USDC'], ['PARADEX_TESTNET', 'USDC']]) {
  test(`${name}: direct confirmation rejects stale live intent before requesting unsupported data`, async () => {
    const { preparePresetAmount, calls } = setup()
    const asset = { ...token, symbol }
    await assert.rejects(preparePresetAmount({ ...values, amountMode: 'min',
      from: { name, token: asset }, fromAsset: asset,
    }, 'source', {}, [], false), /Select an amount again/)
    assert.deepEqual(calls, [])
  })
}

test('Max confirmation reserves the maximum fee plus the native account reserve', async () => {
  const { preparePresetAmount } = setup({ balance: 20, gas: 0.01, maxFee: 0.02, reserve: 10,
    limits: { min_amount: 0.001, max_amount: 30 } })
  const amount = await preparePresetAmount({ ...values, amountMode: 'max', amount: '19' }, 'source', {}, [], false)
  assert.equal(amount, '9.9796')
  const refreshed = setup({ balance: 20, gas: 0.01, maxFee: 0.04, reserve: 10,
    limits: { min_amount: 0.001, max_amount: 30 } })
  assert.equal(await refreshed.preparePresetAmount({ ...values, amountMode: 'max', amount }, 'source', {}, [], false), '9.9592')
})
