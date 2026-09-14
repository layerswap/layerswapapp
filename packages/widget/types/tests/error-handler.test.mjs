import assert from 'node:assert/strict'
import test from 'node:test'
import { ErrorHandler, getErrorOccurrenceId, setErrorLogger, defaultErrorLogger } from '../dist/esm/index.js'

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

test('a standalone consumer cannot break an operation with a throwing logger', t => {
  const errors = t.mock.method(console, 'error', () => {})
  const logs = t.mock.method(console, 'log', () => {})
  t.after(() => setErrorLogger(defaultErrorLogger))
  const failure = new Error('logger failed')
  let calls = 0
  setErrorLogger(() => { calls++; throw failure })

  const event = { type: 'WalletError', message: 'wallet failed' }
  assert.doesNotThrow(() => ErrorHandler(event))
  assert.doesNotThrow(() => ErrorHandler(event))
  assert.equal(calls, 2, 'the guard resets after a failed callback')
  assert.equal(errors.mock.calls[0].arguments[1], failure)
  assert.equal(logs.mock.calls[0].arguments[1].message, event.message)
})

test('a standalone logger cannot recursively report through ErrorHandler', t => {
  const errors = t.mock.method(console, 'error', () => {})
  t.mock.method(console, 'log', () => {})
  t.after(() => setErrorLogger(defaultErrorLogger))
  let calls = 0
  setErrorLogger(event => { calls++; ErrorHandler(event) })

  assert.doesNotThrow(() => ErrorHandler({ type: 'GasProviderError', message: 'RPC failed' }))
  assert.equal(calls, 1)
  assert.equal(errors.mock.callCount(), 1)
  assert.match(errors.mock.calls[0].arguments[1].message, /Recursive/)
})
