import assert from 'node:assert/strict'
import test from 'node:test'
import { isUserRejection } from '../dist/esm/components/Pages/Swap/Withdraw/Wallet/Common/isUserRejection.js'

test('recognizes wallet adapters that classify rejection by error name', () => {
  const error = new Error('Request was cancelled')
  error.name = 'TransactionRejected'

  assert.equal(isUserRejection(error), true)
})

test('recognizes the standard EIP-1193 rejection code', () => {
  assert.equal(isUserRejection({ code: 4001 }), true)
})

test('does not classify an unexpected wallet failure as user rejection', () => {
  assert.equal(isUserRejection(new Error('RPC endpoint unavailable')), false)
})
