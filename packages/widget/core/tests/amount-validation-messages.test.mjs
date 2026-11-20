import assert from 'node:assert/strict'
import test from 'node:test'
import { formValidation } from './helpers/source.mjs'

const { resolveFormValidation, FORM_VALIDATION_ERROR_CODES } = formValidation
const token = { symbol: 'USDC', decimals: 6 }
const values = { from: { name: 'ARBITRUM_MAINNET' }, fromAsset: token,
  to: { name: 'BASE_MAINNET' }, toAsset: { symbol: 'ETH', decimals: 18 },
  destination_address: 'destination', depositMethod: 'wallet', amountMode: 'manual' }
const validate = (valueChanges = {}, options = {}) => resolveFormValidation({
  values: { ...values, ...valueChanges }, minAllowedAmount: 0.089012,
  maxAllowedAmount: 100, minAllowedAmountInUsd: 0.089012, isUsdMode: false, ...options,
})

for (const isUsdMode of [false, true]) {
  test(`empty and zero inputs request an amount in ${isUsdMode ? 'USD' : 'token'} mode`, () => {
    for (const amountMode of ['manual', 'fixed'])
      for (const amount of [undefined, '', '0', '0.000'])
        assert.equal(validate({ amount, amountMode }, { isUsdMode }).message, 'Enter an amount')
  })

  test(`positive amounts below minimum show the limit in ${isUsdMode ? 'USD' : 'token'} mode`, () => {
    assert.deepEqual(validate({ amount: '0.01' }, { isUsdMode }), {
      code: FORM_VALIDATION_ERROR_CODES.MIN_AMOUNT_ERROR,
      message: isUsdMode ? 'Minimum is $0.09' : 'Minimum is 0.089012 USDC',
    })
    assert.equal(validate({ amount: '0.089012' }, { isUsdMode }).message, '')
  })
}

test('the minimum falls back to token units without a USD limit and rounds up to a valid token unit', () => {
  assert.equal(validate({ amount: '0.01' }, { isUsdMode: true, minAllowedAmountInUsd: undefined }).message,
    'Minimum is 0.089012 USDC')
  assert.equal(validate({ amount: '0.01' }, { minAllowedAmount: 0.0890121 }).message,
    'Minimum is 0.089013 USDC')
  assert.equal(validate({ amount: '0.089013' }, { minAllowedAmount: 0.0890121 }).message, '')
  assert.equal(validate({ amount: '0.00000001', fromAsset: { symbol: 'ETH', decimals: 18 } },
    { minAllowedAmount: 0.00000012 }).message, 'Minimum is 0.00000012 ETH')
})

test('exchange shortcuts use normal amount validation; manual deposit amounts remain optional', () => {
  const exchange = { depositMethod: 'deposit_address', fromExchange: { name: 'exchange' }, amountMode: 'fixed' }
  assert.equal(validate({ ...exchange, amount: '0' }).message, 'Enter an amount')
  assert.equal(validate({ ...exchange, amount: '0.01' }).message, 'Minimum is 0.089012 USDC')
  assert.equal(validate({ depositMethod: 'deposit_address', amount: '0' }).message, '')
})

test('preset availability errors retain priority over an empty amount and route errors', () => {
  for (const amountMode of ['min', 'half', 'max']) {
    assert.equal(validate({ amountMode, amount: '0', amountPresetError: 'Insufficient USDC balance' },
      { quoteError: { code: 'ROUTE_NOT_FOUND_ERROR' } }).message, 'Insufficient USDC balance')
  }
  assert.equal(validate({ amount: '-1' }).message, "Can't be negative")
  assert.equal(validate({ amount: '101' }).code, FORM_VALIDATION_ERROR_CODES.MAX_AMOUNT_ERROR)
})
