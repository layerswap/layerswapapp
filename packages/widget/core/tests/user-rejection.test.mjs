import assert from 'node:assert/strict'
import test from 'node:test'
import { isUserRejection } from '../dist/esm/components/Pages/Swap/Withdraw/Wallet/Common/isUserRejection.js'
import { BaseError, UserRejectedRequestError, UnauthorizedProviderError, TransactionRejectedRpcError } from 'viem'
import { lifecycleErrorDetails } from '../dist/esm/lib/swapLifecycle.js'
import { ActionMessageType } from '@layerswap/widget-types'
import { userRejectedError, walletActionError } from '@layerswap/wallet-core/errors'

test('the rejected UI label alone is not a rejection; the adapter-declared reason is', () => {
  const labelOnly = new Error('Request was cancelled')
  labelOnly.name = 'TransactionRejected'
  assert.equal(isUserRejection(labelOnly), false)
  assert.equal(lifecycleErrorDetails(labelOnly).reasonCode, 'unknown_error')

  const declared = userRejectedError()
  assert.equal(isUserRejection(declared), true)
  assert.equal(lifecycleErrorDetails(declared).reasonCode, 'user_rejected')
  assert.equal(isUserRejection({ type: 'SwapWithdrawalError', message: 'Withdrawal failed', cause: declared }), true)

  const unverified = walletActionError(ActionMessageType.TransactionRejected, { message: 'Execute failed' })
  assert.equal(isUserRejection(unverified), false)
  assert.equal(lifecycleErrorDetails(unverified).reason, 'Execute failed')
  assert.equal(lifecycleErrorDetails(unverified).reasonCode, 'unknown_error')
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
