import assert from 'node:assert/strict'
import test from 'node:test'
import { isUserRejection } from '../dist/esm/components/Pages/Swap/Withdraw/Wallet/Common/isUserRejection.js'
import { BaseError, UserRejectedRequestError, UnauthorizedProviderError, TransactionRejectedRpcError } from 'viem'
import { lifecycleErrorDetails } from '../dist/esm/lib/swapLifecycle.js'

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

test('execution and lifecycle agree for bare ethers codes and wrapped viem rejections', () => {
  for (const error of [
    Object.assign(new Error('Request declined'), { code: 'ACTION_REJECTED' }),
    new BaseError('Transaction failed', { cause: new UserRejectedRequestError(new Error('Request declined')) }),
  ]) {
    assert.equal(isUserRejection(error), true)
    assert.equal(lifecycleErrorDetails(error).reasonCode, 'user_rejected')
  }
})

test('viem authorization and RPC rejection errors remain failures', () => {
  for (const error of [
    new UnauthorizedProviderError(new Error('Account is unavailable')),
    new TransactionRejectedRpcError(new Error('Transaction rejected by node')),
  ]) assert.equal(isUserRejection(error), false)
})
