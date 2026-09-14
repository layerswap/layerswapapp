import assert from 'node:assert/strict'
import test from 'node:test'
import { ErrorHandler, getErrorOccurrenceId, setErrorLogger } from '@layerswap/widget-types'

test('native errors retain non-enumerable details without mutating the original', () => {
  const error = Object.freeze(new TypeError('Host callback failed', {
    cause: new Error('Inner failure'),
  }))
  const received = []
  setErrorLogger(event => received.push(event))

  ErrorHandler(error)
  ErrorHandler(error)

  assert.equal(received.length, 2)
  for (const event of received) {
    assert.equal(event.name, error.name)
    assert.equal(event.message, error.message)
    assert.equal(event.stack, error.stack)
    assert.equal(event.cause, error.cause)
    assert.equal(event.occurrenceId, getErrorOccurrenceId(error))
  }
  assert.equal(received[0].occurrenceId, received[1].occurrenceId)
  assert.equal(error.occurrenceId, undefined)
})

test('structured error events preserve their fields and explicit occurrence ID', () => {
  const event = Object.freeze({
    type: 'SwapWithdrawalError',
    name: 'WithdrawalError',
    message: 'Withdrawal failed',
    stack: 'original stack',
    cause: new Error('RPC failed'),
    swapId: 'swap-123',
    transactionHash: '0x123',
    occurrenceId: 'existing-occurrence',
  })
  let received
  setErrorLogger(value => { received = value })

  ErrorHandler(event)

  assert.deepEqual(received, event)
})
