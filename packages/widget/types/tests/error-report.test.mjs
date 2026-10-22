import assert from 'node:assert/strict'
import test from 'node:test'
import { summarizeError, toErrorReport } from '../dist/esm/errorReport.js'

test('RPC wrappers preserve allowlisted simulation details without exporting requests or credentials', () => {
  // Synthetic Starknet JSON-RPC 41 shape; not a recovered production response.
  // https://github.com/starkware-libs/starknet-specs/blob/master/api/starknet_api_openrpc.json
  const rpc = {
    code: 41, message: 'Transaction execution error',
    data: { transaction_index: 0, execution_error: {
      contract_address: '0x123', class_hash: '0x456', selector: '0x789',
      error: 'execution reverted: API_KEY=private-value, RPC https://rpc.test/private-key?token=private-value',
      calldata: ['private-call'], signature: ['private-signature'],
    }, request: { password: 'private-password' } },
  }
  const error = Object.assign(new Error('UNKNOWN_ERROR'), {
    name: 'WalletRPCError', code: 163, info: { error: rpc },
    request: { body: 'private-request' }, config: { headers: { authorization: 'private-header' } },
  })
  const report = toErrorReport({ type: 'SwapWithdrawalError', message: 'UNKNOWN_ERROR', cause: new Error('Wallet failed', { cause: error }) })
  const wallet = report.cause.cause
  assert.equal(wallet.name, 'WalletRPCError')
  assert.equal(wallet.code, 163)
  assert.equal(wallet.info.error.code, 41)
  const trace = wallet.info.error.data
  assert.equal(trace.transaction_index, 0)
  assert.deepEqual(trace.execution_error, {
    contract_address: '0x123', class_hash: '0x456', selector: '0x789',
    error: { message: 'execution reverted: API_KEY=[REDACTED], RPC https://rpc.test' },
  })
  assert.doesNotMatch(JSON.stringify(report), /private-|calldata|signature|request|headers/)
  assert.equal(error.info.error, rpc, 'the original error is untouched')
  assert.deepEqual(toErrorReport(report), report, 'host reserialization retains the diagnostics')
})

test('revert strings and originalError survive known wrappers; arbitrary data does not', () => {
  assert.deepEqual(summarizeError({ data: { revert_error: 'assertion failed', payload: { secret: 'omit' } } }), {
    data: { revert_error: { message: 'assertion failed' } },
  })
  assert.deepEqual(summarizeError({ data: { originalError: { code: 4100, message: 'Unauthorized' } } }), {
    data: { originalError: { code: 4100, message: 'Unauthorized' } },
  })
  assert.equal(summarizeError({ data: { calldata: ['omit'], signature: 'omit' } }), undefined)
  assert.equal(summarizeError({ data: '{"signature":"private-value"}', info: 'opaque request' }), undefined)
})

test('diagnostics ignore accessors and toJSON, and bound cycles, depth, nodes and escaped JSON size', () => {
  let accesses = 0
  const foreign = { message: 'Known failure', toJSON() { accesses++; throw Error('unsafe') } }
  for (const key of ['error', 'data', 'originalError', 'info', 'revert_error', 'execution_error']) {
    Object.defineProperty(foreign, key, { get() { accesses++; throw Error('unsafe') } })
  }
  foreign.cause = foreign
  assert.deepEqual(summarizeError(foreign), { message: 'Known failure' })
  assert.equal(accesses, 0)

  const tree = depth => depth ? { message: 'branch', cause: tree(depth - 1), data: tree(depth - 1) } : { message: 'leaf' }
  function nodes(value) {
    return 1 + Object.values(value).filter(v => v && typeof v === 'object').reduce((sum, v) => sum + nodes(v), 0)
  }
  assert(nodes(summarizeError(tree(6))) <= 16)
  let deep = { message: 'unreachable leaf' }
  for (let i = 0; i < 20; i++) deep = { cause: deep }
  assert.equal(summarizeError(deep), undefined)
  const huge = { message: '\n"\\'.repeat(8000), data: tree(6), stack: 'large stack'.repeat(8000) }
  assert(JSON.stringify(summarizeError(huge)).length <= 8000)
  assert.equal(summarizeError({ data: ['not an error object'] }), undefined)
})
