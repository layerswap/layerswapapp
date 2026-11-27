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

test('the confirmation check lowers the reviewed amount when a small fee increase consumes its buffer', async () => {
  const { preparePresetAmount, calls } = setup({ gas: 0.10001 })
  assert.equal(await preparePresetAmount({ ...values, amount: '0.898' }, 'source', {}, [], false), '0.897989')
  assert.equal(calls.filter(([name]) => name === 'gas').length, 2)
})

test('the confirmation check lowers an amount when the fresh fee exceeds the reserve', async () => {
  const { preparePresetAmount } = setup({ gas: 0.12 })
  assert.equal(await preparePresetAmount({ ...values, amount: '0.898' }, 'source', {}, [], false), '0.8776')
})


test('Half confirmation preserves a reviewed amount within the full spendable balance', async () => {
  const decreased = setup({ balance: 0.8, gas: 0.1 })
  assert.equal(await decreased.preparePresetAmount({ ...values, amountMode: 'half', amount: '0.449' }, 'source', {}, [], false), '0.449')
  const increased = setup({ balance: 2, gas: 0.01 })
  assert.equal(await increased.preparePresetAmount({ ...values, amountMode: 'half', amount: '0.449' }, 'source', {}, [], false), '0.449')
})

test('Half confirmation replaces an unfundable amount with Half of the payable balance or route cap', async () => {
  const decreased = setup({ balance: 0.5, gas: 0.1 })
  assert.equal(await decreased.preparePresetAmount({ ...values, amountMode: 'half', amount: '0.449' }, 'source', {}, [], false), '0.199')
  const capped = setup({ limits: { min_amount: 0.1, max_amount: 0.4 } })
  assert.equal(await capped.preparePresetAmount({ ...values, amountMode: 'half', amount: '0.449' }, 'source', {}, [], false), '0.2')
})

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

for (const flow of [
  { depositMethod: 'deposit_address' },
  { depositMethod: 'deposit_address', fromExchange: { name: 'exchange' } },
  { depositMethod: 'wallet', fromExchange: { name: 'exchange' } },
  { depositMethod: undefined },
]) {
  for (const mode of ['min', 'half', 'max', 'fixed']) {
    test(`${JSON.stringify(flow)} ${mode}: preparation preserves the submitted amount without live reads`, async () => {
      const { preparePresetAmount, calls } = setup({ limits: { min_amount: 1, max_amount: 2 } })
      assert.equal(await preparePresetAmount({ ...values, ...flow, amountMode: mode }, undefined, undefined, [], false), values.amount)
      assert.deepEqual(calls, [])
    })
  }
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


test('live Max and confirmation reserve the maximum fee plus the native account reserve', async () => {
  const { preparePresetAmount } = setup({ balance: 20, gas: 0.01, maxFee: 0.02, reserve: 10,
    limits: { min_amount: 0.001, max_amount: 30 } })
  const amount = await preparePresetAmount({ ...values, amountMode: 'max', amount: '19' }, 'source', {}, [], false)
  assert.equal(amount, '9.9796')
  const refreshed = setup({ balance: 20, gas: 0.01, maxFee: 0.04, reserve: 10,
    limits: { min_amount: 0.001, max_amount: 30 } })
  assert.equal(await refreshed.preparePresetAmount({ ...values, amountMode: 'max', amount }, 'source', {}, [], false), '9.9592')
})

test('confirmation preserves a reviewed amount that covers the buffered fee', async () => {
  const { preparePresetAmount, calls } = setup({ gas: 0.10001 })
  assert.equal(await preparePresetAmount({ ...values, amount: '0.897' }, 'source', {}, [], false), '0.897')
  assert.equal(calls.filter(([name]) => name === 'gas').length, 1)
})
