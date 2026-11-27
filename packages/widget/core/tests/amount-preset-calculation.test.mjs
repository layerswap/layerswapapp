import assert from 'node:assert/strict'
import test from 'node:test'
import { amountPresets } from './helpers/source.mjs'

const token = { symbol: 'ETH', decimals: 6, price_in_usd: 2000 }
const network = { name: 'ETHEREUM_MAINNET', token }

test('the solver bounds oscillating amount-dependent fees and returns only a covered candidate', async () => {
  const probes = []
  const result = await amountPresets.calculatePresetAmount({ network, token, balance: { amount: 1 }, limit: 10,
    estimateGas: async amount => { probes.push(amount); return { gas: amount > 0.9 ? 0.2 : 0.01, token } },
  })
  assert.equal(result, '0.796')
  assert.equal(probes.length, 2)
})

test('the solver rejects missing balances and gas instead of assuming zero fees', async () => {
  const base = { network, token, balance: { amount: 1 }, limit: 10, estimateGas: async () => undefined }
  await assert.rejects(amountPresets.calculatePresetAmount(base), /network fee/)
  for (const amount of [NaN, Infinity, -1]) {
    await assert.rejects(amountPresets.calculatePresetAmount({ ...base, balance: { amount } }), /balance/)
  }
})

test('small balances stay plain decimals and cannot be rounded above the available token units', async () => {
  const result = await amountPresets.calculatePresetAmount({ network, token: { ...token, decimals: 9 },
    balance: { amount: 0.0000005 }, limit: 10, estimateGas: async () => ({ token, gas: 0.00000001 }) })
  assert.equal(result, '0.000000489')
})

test('provider fees charged in the transferred token are reserved even on a different native asset', async () => {
  const usdc = { symbol: 'USDC', decimals: 6 }
  const result = await amountPresets.calculatePresetAmount({ network, token: usdc, balance: { amount: 50 }, limit: 100,
    estimateGas: async () => ({ token: usdc, gas: 0.01 }) })
  assert.equal(result, '49.9898')
})

test('a fee paid in another asset does not reduce the transferred token amount', async () => {
  const result = await amountPresets.calculatePresetAmount({ network, token: { symbol: 'USDC', decimals: 6 },
    balance: { amount: 50 }, limit: 20, estimateGas: async () => ({ token, gas: 0.1 }) })
  assert.equal(result, '20')
})

test('tiny fee increases on every RPC read do not turn a valid balance into an error', async () => {
  const native = { ...token, decimals: 18 }
  let latestFee = 0.000001846
  let reads = 0
  const balance = 0.05399312
  const result = await amountPresets.calculatePresetAmount({ network: { ...network, token: native }, token: native,
    balance: { amount: balance }, limit: 10, probeAmount: '0.05399123503545234',
    estimateGas: async () => { reads++; latestFee += 0.000000000001; return { token: native, gas: latestFee } },
  })
  assert.equal(reads, 3)
  assert.ok(Number(result) > 0)
  assert.ok(Number(result) + latestFee * 1.02 <= balance, 'The newest buffered fee is covered')
})

test('large fee increases still reduce the amount before returning an affordable result', async () => {
  let reads = 0
  const result = await amountPresets.calculatePresetAmount({ network, token, balance: { amount: 1 }, limit: 10,
    estimateGas: async () => ({ token, gas: ++reads === 1 ? 0.01 : 0.2, reserve: 0.05 }),
  })
  assert.equal(result, '0.746')
  assert.equal(reads, 3)
  assert.ok(Number(result) + 0.2 + 0.05 <= 1)
})

test('fees that repeatedly exceed the reserve remain blocked with a bounded request count', async () => {
  let reads = 0
  await assert.rejects(amountPresets.calculatePresetAmount({ network, token, balance: { amount: 1 }, limit: 10,
    estimateGas: async () => ({ token, gas: 0.01 * 2 ** reads++ }),
  }), /fees are changing/)
  assert.equal(reads, 4)
})

test('half estimates fees for the half transfer and truncates its smallest token unit', async () => {
  const probes = []
  const amount = await amountPresets.calculatePresetAmount({ mode: 'half', network, token, balance: { amount: 1 }, limit: 10,
    probeAmount: '0.5', estimateGas: async amount => { probes.push(amount); return { gas: amount > 0.6 ? 0.2 : 0.01, token } },
  })
  assert.equal(amount, '0.4949')
  assert.deepEqual(probes, [0.5, 0.4949])
  assert.equal(await amountPresets.calculatePresetAmount({ mode: 'half', network, token, balance: { amount: 0.000003 }, limit: 10,
    estimateGas: async () => ({ gas: 0, token }),
  }), '0.000001')
})

for (const preserveAmount of [false, true]) {
  for (const mode of ['max', 'half']) {
    test(`${mode} covers the withdrawal buffer after a small fee increase (preserve=${preserveAmount})`, async () => {
      const native = { ...token, decimals: 18 }
      let reads = 0
      const result = await amountPresets.calculatePresetAmount({
        mode, preserveAmount, network: { ...network, token: native }, token: native,
        balance: { amount: 1 }, limit: 10,
        probeAmount: preserveAmount ? (mode === 'max' ? '0.99898' : '0.49949') : '1',
        estimateGas: async () => ({ token: native, gas: ++reads === 1 && !preserveAmount ? 0.001 : 0.00101 }),
      })
      const spendable = 1 - 0.00101 * 1.02
      assert.ok(Number(result) <= spendable * (mode === 'half' && !preserveAmount ? 0.5 : 1))
      if (mode === 'half' && preserveAmount) {
        assert.equal(result, '0.49949', 'a fee increase cannot reduce a fundable reviewed Half')
      }
      assert.ok(reads <= 4)
    })
  }
}

test('confirmation reduces an amount covering only the raw fee instead of preserving it', async () => {
  const result = await amountPresets.calculatePresetAmount({
    preserveAmount: true, network, token, balance: { amount: 1 }, limit: 10,
    probeAmount: '0.9899', estimateGas: async () => ({ token, gas: 0.01 }),
  })
  assert.equal(result, '0.9898')
})

test('the fee floor only raises a successful estimate in the same fee token, keeping the larger reserve', () => {
  const { withGasFloor } = amountPresets
  const floor = { gas: 0.1, token }
  assert.equal(withGasFloor(undefined, floor), undefined, 'a failed estimate stays a failure')
  assert.deepEqual(withGasFloor({ gas: 0.01, maxFee: 0.15, token }, floor), { gas: 0.01, maxFee: 0.15, token }, 'budgets compare the maximum fee')
  assert.deepEqual(withGasFloor({ gas: 0.01, reserve: 0.1, token }, floor), { gas: 0.1, reserve: 0.1, token }, 'the live reserve survives a floor that raises the fee')
  assert.deepEqual(withGasFloor({ gas: 0.2, token }, { gas: 0.1, reserve: 0.05, token }), { gas: 0.2, reserve: 0.05, token }, 'a reserve only the floor knows is kept')
  const other = { symbol: 'USDC', decimals: 6 }
  assert.deepEqual(withGasFloor({ gas: 0.01, token: other }, floor), { gas: 0.01, token: other }, 'a floor in another fee token is ignored')
})

test('automatic revisions require a reduction within one percent or one cent at a known price', () => {
  const { isSmallAmountRevision } = amountPresets
  assert.equal(isSmallAmountRevision('0.9', '0.895'), true)
  assert.equal(isSmallAmountRevision('0.9', '0.89', 1800), false)
  assert.equal(isSmallAmountRevision('0.0001', '0.000098', 1800), true)
  assert.equal(isSmallAmountRevision('0.0001', '0.000098'), false)
  assert.equal(isSmallAmountRevision('0.0001', '0.000098', 0), false)
})
