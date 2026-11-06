import assert from 'node:assert/strict'
import test from 'node:test'
import { amountPresets, loadSource } from './helpers/source.mjs'
const { resolveGasBalanceBudget } = loadSource('lib/gases/resolveGasBalanceBudget.ts')
const transferGas = loadSource('lib/gases/resolveTransferGas.ts', {
  '@/helpers/depositActions': loadSource('helpers/depositActions.ts'),
})
const token = { symbol: 'NATIVE', decimals: 8 }
const network = { name: 'source', token }
const unit = 1e8

test('Max converges when a fee includes an unspendable remainder', async () => {
  for (const probeAmount of ['0.00009362', '0.00009363', undefined]) {
    const probes = []
    const result = await amountPresets.calculatePresetAmount({
      network, token, balance: { amount: 10000 / unit }, limit: 1, probeAmount,
      estimateGas: async amount => {
        const sats = Math.round(amount * unit)
        probes.push(sats)
        const withChange = 10000 - sats - 344 >= 294
        return { token, gas: (withChange || sats > 9718 ? 344 : 10000 - sats) / unit,
          requiredFee: (withChange || sats > 9718 ? 344 : 282) / unit }
      },
    })
    assert.equal(result, '0.00009712')
    assert.ok(probes.length <= 4)
  }
})

test('affordability covers total fees without buffering an absorbed remainder', () => {
  assert.equal(resolveGasBalanceBudget({ gas: 637 / unit, requiredFee: 282 / unit }), 637 / unit)
  assert.equal(resolveGasBalanceBudget({ gas: 282 / unit, requiredFee: 282 / unit }), 282 / unit * 1.02)
  assert.equal(resolveGasBalanceBudget({ gas: 1, maxFee: 2, reserve: 3 }), 5.04)
  assert.equal(resolveGasBalanceBudget({ gas: 1, reserve: 3 }), 4.02)
})

test('a required fee cannot hide an unaffordable actual fee', async () => {
  await assert.rejects(amountPresets.calculatePresetAmount({
    network, token, balance: { amount: 1 }, limit: 1,
    estimateGas: async () => ({ token, gas: 2, requiredFee: 0.01 }),
  }), /fees are changing/)
})

test('exact fee inputs preserve recipient, memo, amount and cache identity on any network', () => {
  const action = { type: 'transfer', step: 'transfer', amount: 0.00009363, to_address: 'recipient',
    from_address: 'sender', call_data: '22911311;', amount_in_base_units: '0', network, token }
  const result = transferGas.resolveTransferGas(action, network, token, 'sender')
  assert.deepEqual(result, { amount: action.amount, transaction: {
    recipientAddress: 'recipient', callData: '22911311;', amountInBaseUnits: '0',
  } })
  const key = transferGas.gasEstimateKey({ ...result.transaction, amount: result.amount, network, token, address: 'sender' })
  assert.deepEqual(key, ['/gases/sender/source/NATIVE/0.00009363', 'recipient', '22911311;', '0'])
  assert.equal(transferGas.resolveTransferGas(action, { name: 'other' }, token, 'sender'), undefined)
  assert.equal(transferGas.resolveTransferGas(action, network, token, 'other'), undefined)
  assert.equal(transferGas.transferFeeChanged({ token, gas: 338 / unit }, { token, gas: 637 / unit }), true)
  assert.equal(transferGas.transferFeeChanged({ token, gas: 637 / unit }, { token, gas: 637 / unit }), false)
})


test('an exact transfer does not require an uncharged safety margin', () => {
  const { default: useOutOfGas } = loadSource('lib/gases/useOutOfGas.ts', {
    './useSWRGas': { default: () => ({}) }, './resolveGasBalanceBudget': { resolveGasBalanceBudget },
  })
  const args = { network, token, amount: 9859 / unit,
    balances: [{ token: token.symbol, amount: 10000 / unit, isNativeCurrency: true }],
    minAllowedAmount: 0.000001, maxAllowedAmount: 1,
    gasEstimate: { gasData: { token, gas: 141 / unit, requiredFee: 141 / unit } },
    transaction: { recipientAddress: 'recipient', callData: 'memo' } }
  assert.equal(useOutOfGas(args).outOfGas, false)
  assert.equal(useOutOfGas({ ...args, amount: 9860 / unit }).outOfGas, true)
  assert.equal(useOutOfGas({ ...args, transaction: undefined }).outOfGas, true)
  assert.equal(resolveGasBalanceBudget({ gas: 1, maxFee: 2 }, { exactTransfer: true }), 2.04)
})
