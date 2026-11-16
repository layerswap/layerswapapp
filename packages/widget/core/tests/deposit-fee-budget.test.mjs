import assert from 'node:assert/strict'
import test from 'node:test'
import { loadSource, amountPresets } from './helpers/source.mjs'

// The deposit fee budget shared by the withdrawal view's Adjust amount and the
// post-creation Max check: which deposit action prices the real transaction, and
// how far the reviewed amount must drop so the account can still pay its fee.
const { resolveDepositGasTransaction } = loadSource('helpers/depositActions.ts')
const { resolveDepositFeeAdjustedAmount, isSmallAmountRevision } = amountPresets

test('a reduction within one percent or within one cent is applied without another review', () => {
  assert.equal(isSmallAmountRevision('0.00100549', '0.001005'), true, 'the World Chain fee gap')
  assert.equal(isSmallAmountRevision('0.9', '0.8911'), true)
  assert.equal(isSmallAmountRevision('0.9', '0.89'), false, 'over one percent with no price known')
  assert.equal(isSmallAmountRevision('0.9', '0.89', 1800), false, 'over one percent and worth $18')
  // A tiny send: the fee gap is 2% of the amount but a third of a cent.
  assert.equal(isSmallAmountRevision('0.0001', '0.000098', 1800), true)
  assert.equal(isSmallAmountRevision('0.0001', '0.000098'), false, 'without a price only the share applies')
  assert.equal(isSmallAmountRevision('0.001', '0.00098', 1800), false, 'two percent and $0.036')
  assert.equal(isSmallAmountRevision('0.001', '0.00098', 0), false, 'a zero price is unknown, not free')
  assert.equal(isSmallAmountRevision('0.9', '0.9'), false, 'an unchanged amount is not a revision')
  assert.equal(isSmallAmountRevision('0.9', '0.95'), false, 'an increase is never applied')
  assert.equal(isSmallAmountRevision('0.9', '0'), false)
  assert.equal(isSmallAmountRevision('', '0.5'), false)
})

const eth = { symbol: 'ETH', decimals: 18 }
const usdc = { symbol: 'USDC', decimals: 6, contract: '0xusdc' }
const balance = amount => ({ network: 'WORLDCHAIN_MAINNET', token: 'ETH', amount, isNativeCurrency: true })

test('the World Chain deposit: Max priced a plain transfer, the real contract call needs ten times the fee', () => {
  // Max budgeted the 21k transfer; the deposit action is a ~240k contract call.
  const transferFee = 3.8e-8
  const depositFee = 4e-7
  const funds = 0.001
  const requested = String(funds - transferFee * 1.02)
  const adjusted = resolveDepositFeeAdjustedAmount({
    requestedAmount: requested, walletBalance: balance(funds), gas: { gas: depositFee, token: eth },
    token: eth, nativeToken: eth, limitsMaxAmount: 10, minAllowedAmount: 0.0001,
  })
  assert.ok(adjusted !== undefined, 'the reviewed amount cannot fund the deposit fee')
  assert.ok(Number(adjusted) < Number(requested))
  assert.ok(Number(adjusted) + depositFee * 1.02 <= funds, 'the reduced amount leaves the buffered fee in the account')
  assert.ok(Number(adjusted) >= 0.0001)
  assert.equal(resolveDepositFeeAdjustedAmount({
    requestedAmount: adjusted, walletBalance: balance(funds), gas: { gas: depositFee, token: eth },
    token: eth, nativeToken: eth, limitsMaxAmount: 10, minAllowedAmount: 0.0001,
  }), undefined, 'the reduced amount fits, so a second pass changes nothing')
})

test('an amount that already fits beside the fee is never changed', () => {
  assert.equal(resolveDepositFeeAdjustedAmount({
    requestedAmount: '0.5', walletBalance: balance(1), gas: { gas: 0.01, token: eth },
    token: eth, nativeToken: eth, limitsMaxAmount: 10,
  }), undefined)
})

test('a reduction below the route minimum is not offered', () => {
  assert.equal(resolveDepositFeeAdjustedAmount({
    requestedAmount: '0.1', walletBalance: balance(0.1), gas: { gas: 0.05, token: eth },
    token: eth, nativeToken: eth, limitsMaxAmount: 10, minAllowedAmount: 0.08,
  }), undefined)
})

test('the account reserve and the fee token both count against a native amount', () => {
  assert.equal(resolveDepositFeeAdjustedAmount({
    requestedAmount: '1', walletBalance: balance(1), gas: { gas: 0.1, maxFee: 0.2, reserve: 0.1, token: eth },
    token: eth, nativeToken: eth, limitsMaxAmount: 10,
  }), '0.696')
})

test('a token paying its fee in the native currency is only capped by its own balance', () => {
  const usdcBalance = amount => ({ network: 'WORLDCHAIN_MAINNET', token: 'USDC', amount })
  assert.equal(resolveDepositFeeAdjustedAmount({
    requestedAmount: '100', walletBalance: usdcBalance(100), gas: { gas: 0.5, token: eth },
    token: usdc, nativeToken: eth, limitsMaxAmount: 1000,
  }), undefined)
  assert.equal(resolveDepositFeeAdjustedAmount({
    requestedAmount: '100', walletBalance: usdcBalance(90), gas: { gas: 0.5, token: eth },
    token: usdc, nativeToken: eth, limitsMaxAmount: 1000,
  }), '90')
})

test('an unknown fee is not a zero fee', () => {
  assert.equal(resolveDepositFeeAdjustedAmount({
    requestedAmount: '1', walletBalance: balance(0.5), gas: undefined,
    token: eth, nativeToken: eth, limitsMaxAmount: 10,
  }), undefined)
})

const source = { network: { name: 'WORLDCHAIN_MAINNET', type: 'evm' }, token: 'ETH', address: '0xAbC' }
const action = {
  type: 'transfer', step: 'deposit', status: 'action_required', to_address: '0xdeposit', amount: 0.9,
  amount_in_base_units: '900000000000000000', call_data: '0x9afe9145', from_address: '0xabc',
  network: { name: 'WORLDCHAIN_MAINNET' }, token: { symbol: 'ETH' },
}

test('the actionable transfer becomes the exact gas transaction for its own EVM source account', () => {
  const resolved = resolveDepositGasTransaction([action], source)
  assert.equal(resolved.action, action)
  assert.deepEqual(resolved.transaction, { recipientAddress: '0xdeposit', callData: '0x9afe9145', amountInBaseUnits: '900000000000000000' })
  assert.equal(resolveDepositGasTransaction([{ ...action, call_data: null }], source).transaction.callData, '', 'a plain transfer is an empty payload, not an unknown one')
  assert.equal(resolveDepositGasTransaction([{ ...action, from_address: undefined, network: undefined, token: undefined }], source).action.to_address, '0xdeposit')
})

test('only EVM gas providers price a payload, and only for the swap\'s own route and account', () => {
  assert.equal(resolveDepositGasTransaction([action], { ...source, network: { name: 'SOLANA_MAINNET', type: 'solana' } }), undefined)
  assert.equal(resolveDepositGasTransaction([action], { ...source, network: { name: 'OPTIMISM_MAINNET', type: 'evm' } }), undefined)
  assert.equal(resolveDepositGasTransaction([action], { ...source, token: 'USDC' }), undefined)
  assert.equal(resolveDepositGasTransaction([action], { ...source, address: '0xother' }), undefined)
  assert.equal(resolveDepositGasTransaction([action], { ...source, address: undefined }), undefined)
})

test('actions that are not a priceable transfer yield no transaction', () => {
  assert.equal(resolveDepositGasTransaction(undefined, source), undefined)
  assert.equal(resolveDepositGasTransaction([], source), undefined)
  assert.equal(resolveDepositGasTransaction([{ type: 'sign', step: 'sign', status: 'action_required', typed_data: {} }], source), undefined)
  assert.equal(resolveDepositGasTransaction([{ ...action, status: 'completed' }], source), undefined)
  assert.equal(resolveDepositGasTransaction([{ ...action, to_address: undefined }], source), undefined)
  assert.equal(resolveDepositGasTransaction([{ ...action, amount: undefined }], source), undefined)
})
