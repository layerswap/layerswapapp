import assert from 'node:assert/strict'
import test from 'node:test'
import { ErrorHandler, getErrorOccurrenceId, setErrorLogger, setErrorClassifier, defaultErrorLogger } from '../dist/esm/index.js'

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
    assert.deepEqual(event.cause, { name: error.cause.name, message: error.cause.message, stack: error.cause.stack })
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

  assert.deepEqual(received, { ...event, cause: { name: event.cause.name, message: event.cause.message, stack: event.cause.stack } })
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
  assert.deepEqual(errors.mock.calls[0].arguments[1], { name: failure.name, message: failure.message, stack: failure.stack })
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

test('all public reports are allowlisted data, including nested causes, responses and failed token diagnostics', () => {
  const events = []
  setErrorLogger(event => events.push(event))
  let serializerCalls = 0
  const unsafe = {
    name: 'AxiosError', message: 'Request failed', code: 'ERR_BAD_RESPONSE',
    config: { headers: { 'X-LS-APIKEY': 'secret-key' }, data: { signature: 'secret-signature' } },
    request: { body: 'secret-request' },
    toJSON() { serializerCalls++; throw new Error('must never run') },
  }
  unsafe.cause = unsafe
  const body = { error: { code: 'SERVER_ERROR', message: 'Unavailable', request: unsafe }, echo: unsafe }
  for (const type of ['APIError', 'SwapWithdrawalError', 'GasMiscalculation', 'SideEffectError', 'CallbackError']) {
    ErrorHandler({ type, message: 'Failed', cause: unsafe, responseData: body, response_data: body,
      failed_tokens: [{ token: 'ETH', response_data: body, config: unsafe.config }],
      unrelatedProviderData: unsafe, requestUrl: 'https://user:password@api.test/path?signature=secret-signature#secret',
    })
  }
  assert.equal(serializerCalls, 0)
  for (const event of events) {
    assert.equal(event.cause.code, 'ERR_BAD_RESPONSE')
    assert.notEqual(event.cause, unsafe)
    assert.equal(event.requestUrl, 'https://api.test/path')
    assert.deepEqual(event.responseData, { error: { code: 'SERVER_ERROR', message: 'Unavailable' } })
    assert.deepEqual(event.failed_tokens[0].response_data, event.responseData)
    assert.doesNotMatch(JSON.stringify(event), /secret-|config|headers|signature|unrelatedProviderData|toJSON/)
  }
  assert.equal(new Set(events.map(e => e.occurrenceId)).size, 1)
  assert.equal(unsafe.config.headers['X-LS-APIKEY'], 'secret-key', 'original errors remain available to recovery logic')
})

test('foreign getters are ignored and throwing logger fallbacks also receive safe summaries', t => {
  let getters = 0
  const error = { name: 'ForeignError', message: 'Failed', toJSON() { throw new Error('do not serialize') } }
  for (const key of ['cause', 'stack', 'config']) Object.defineProperty(error, key, { get() { getters++; throw new Error('do not read') } })
  const received = []
  setErrorLogger(event => received.push(event))
  assert.doesNotThrow(() => ErrorHandler({ type: 'WalletError', message: 'Failed', cause: error }))
  assert.equal(getters, 0)
  assert.deepEqual(received[0].cause, { name: 'ForeignError', message: 'Failed' })
  const fallback = t.mock.method(console, 'error', () => {})
  t.mock.method(console, 'log', () => {})
  setErrorLogger(() => { throw Object.assign(new Error('Logger failed'), { config: { apiKey: 'secret' } }) })
  assert.doesNotThrow(() => ErrorHandler({ type: 'WalletError', message: 'Failed', cause: error }))
  assert.doesNotMatch(JSON.stringify(fallback.mock.calls[0].arguments), /apiKey|secret|config/)
  assert.equal(getters, 0)
})

test('engine-owned prototype getters are read, so DOMException causes keep their details', () => {
  const received = []
  setErrorLogger(event => received.push(event))
  const cause = new DOMException('The request is not allowed', 'NotAllowedError')
  ErrorHandler({ type: 'WalletError', message: 'Passkey failed', cause })
  assert.equal(received[0].cause.name, 'NotAllowedError')
  assert.equal(received[0].cause.message, 'The request is not allowed')
  assert.equal(received[0].cause.code, cause.code)
})

test('replacing the logger keeps the registered classifier', t => {
  t.after(() => setErrorClassifier(undefined))
  setErrorClassifier(event => event.type === 'WalletError' ? 'user_rejected' : undefined)
  const received = []
  setErrorLogger(event => received.push(event))
  ErrorHandler({ type: 'WalletError', message: 'Declined' })
  ErrorHandler({ type: 'WalletError', message: 'Declined', reasonCode: 'unauthorized' })
  ErrorHandler({ type: 'APIError', message: 'Failed' })
  assert.deepEqual(received.map(event => event.reasonCode), ['user_rejected', 'unauthorized', undefined])
})

test('provider URLs keep only scheme and host, API routes and code locations keep their path', () => {
  const received = []
  setErrorLogger(event => received.push(event))
  const rpc = 'https://eth-mainnet.g.alchemy.com/v2/rpc-path-key'
  const cause = Object.assign(new Error(`HTTP request failed.\n\nURL: ${rpc}\nRequest body: {"method":"eth_call"}`), { url: rpc })
  cause.stack = `HttpRequestError: HTTP request failed. URL: ${rpc}\n    at call (https://app.test/_next/static/chunk.js?v=1:12:34)\n    at fn@https://app.test/app.js:7`
  ErrorHandler({
    type: 'BalanceProviderError', message: `RPC ${rpc} failed`, cause,
    node_url: `wss://user:pass@rpc.test/ws/rpc-path-key?token=x`, nodes: [rpc, 'https://rpc.test:8545'],
    request_url: rpc, failed_tokens: [{ token: 'ETH', request_url: rpc }],
  })
  ErrorHandler({ type: 'APIError', message: 'Failed', endpoint: '/swaps/swap-1?secret=x', requestUrl: 'https://api.test/api/v2/swaps/swap-1' })
  const [balance, api] = received
  assert.doesNotMatch(JSON.stringify(balance), /rpc-path-key|pass|token=/)
  assert.equal(balance.message, 'RPC https://eth-mainnet.g.alchemy.com failed')
  assert.equal(balance.node_url, 'wss://rpc.test')
  assert.deepEqual(balance.nodes, ['https://eth-mainnet.g.alchemy.com', 'https://rpc.test:8545'])
  assert.equal(balance.request_url, 'https://eth-mainnet.g.alchemy.com')
  assert.deepEqual(balance.failed_tokens, [{ token: 'ETH', request_url: 'https://eth-mainnet.g.alchemy.com' }])
  assert.equal(balance.cause.url, 'https://eth-mainnet.g.alchemy.com')
  assert.match(balance.cause.stack, /at call \(https:\/\/app\.test\/_next\/static\/chunk\.js:12:34\)/)
  assert.match(balance.cause.stack, /fn@https:\/\/app\.test\/app\.js:7$/)
  assert.equal(api.endpoint, '/swaps/swap-1')
  assert.equal(api.requestUrl, 'https://api.test/api/v2/swaps/swap-1')
})

test('wallet signature messages stay readable while credentials are redacted', () => {
  const received = []
  setErrorLogger(event => received.push(event))
  ErrorHandler({ type: 'WalletError', message: 'Invalid signature: v must be 27 or 28, password=hunter2' })
  assert.equal(received[0].message, 'Invalid signature: v must be 27 or 28, password=[REDACTED]')
})
