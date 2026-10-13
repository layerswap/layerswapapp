import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
import { loadSource, maxAmount } from './helpers/source.mjs'

const token = { symbol: 'ETH', decimals: 6 }
const network = { name: 'ETHEREUM_MAINNET', token }
const values = { amount: '0.95', from: network, fromAsset: token, to: { name: 'BASE_MAINNET' },
  toAsset: token, destination_address: 'destination', depositMethod: 'wallet', refuel: false }
const setup = ({ balance = 1, gas = 0.1, limits = { min_amount: 0.001, max_amount: 2 } } = {}) => {
  const calls = []
  const { prepareMaxAmount } = loadSource('lib/prepareMaxAmount.ts', {
    '@layerswap/widget-types': { usesDepository: () => false },
    '@/hooks/useFee': { buildLimitsUrl: args => { calls.push(['limits', args]); return 'limits' } },
    './apiClients/layerSwapApiClient': { default: class { async fetcher() { return { data: limits } } } },
    './extendedRoutes/registry': { resolveExtendedRoutePlan: () => undefined },
    './extendedRoutes/transforms': {},
    '@/stores/balanceStore': { useBalanceStore: { getState: () => ({ fetchBalance: async (address, chain, options) => {
      calls.push(['balance', address, chain.name, options])
      return { balances: [{ network: chain.name, token: token.symbol, amount: balance }] }
    } }) } },
    './resolvers/resolverService': { resolverService: { getGasResolver: () => ({ getGas: async args => {
      calls.push(['gas', args]); return { gas, token }
    } }) } },
    './maxAmount': maxAmount,
  })
  return { prepareMaxAmount, calls }
}

test('creation preparation bypasses cached balances, refreshes matching limits and estimates the payable amount', async () => {
  const { prepareMaxAmount, calls } = setup()
  const wallet = { id: 'wallet' }
  const amount = await prepareMaxAmount(values, 'source', wallet, [], false)
  assert.equal(amount, '0.898')
  assert.deepEqual(calls[0], ['balance', 'source', network.name, { ignoreCache: true }])
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
  assert.equal(await capped.prepareMaxAmount(values, 'source', {}, [], false), '0.5')
  const tooSmall = setup({ balance: 0.01 })
  await assert.rejects(tooSmall.prepareMaxAmount(values, 'source', {}, [], false), /below the minimum/)
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

test('the confirmation check keeps the reviewed amount when a small fee increase fits the reserve', async () => {
  const { prepareMaxAmount, calls } = setup({ gas: 0.10001 })
  assert.equal(await prepareMaxAmount({ ...values, amount: '0.898' }, 'source', {}, [], false), '0.898')
  assert.equal(calls.filter(([name]) => name === 'gas').length, 1)
})

test('the confirmation check lowers an amount when the fresh fee exceeds the reserve', async () => {
  const { prepareMaxAmount } = setup({ gas: 0.12 })
  assert.equal(await prepareMaxAmount({ ...values, amount: '0.898' }, 'source', {}, [], false), '0.8776')
})
