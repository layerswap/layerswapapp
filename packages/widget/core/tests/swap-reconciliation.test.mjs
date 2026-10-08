import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'

const apiUrl = 'data:text/javascript,' + encodeURIComponent(`
  export const TransactionStatus = { Pending: 'pending', Failed: 'failed', Completed: 'completed' }
  export const BackendTransactionStatus = TransactionStatus
  export const TransactionType = { Input: 'input' }
  export default class {}
`)
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('/apiClients/layerSwapApiClient')) return { url: apiUrl, shortCircuit: true }
  if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) return nextResolve(specifier + '.js', context)
  return nextResolve(specifier, context)
} })
after(() => hooks.deregister())
const { reconcileSwap, withSwapReconciliation } = await import('../dist/esm/lib/swapReconciliation.js')

const sign = { step: 'sign', type: 'sign', status: 'action_required' }
const publish = { step: 'publish', type: 'transfer', status: 'action_required' }
function backend({ actions = [sign, publish], omitActions = false, authorization = { status: 'initiated' }, transactions = [], status = 'user_transfer_pending', receipt = 'pending' } = {}) {
  const calls = []
  return {
    calls,
    async GetSwapAsync(id, source) {
      calls.push(['swap', id, source])
      return { data: { swap: { id, source_network: { name: 'BASE' }, status, transactions }, ...(omitActions ? {} : { deposit_actions: actions }) } }
    },
    async GetGaslessAuthorizationAsync(id) { calls.push(['authorize', id]); return { data: authorization } },
    async GetTransactionStatus(network, hash) { calls.push(['receipt', network, hash]); return { data: { status: receipt } } },
  }
}
const reconcile = (client, evidence = {}) => reconcileSwap('A', 'source', evidence, client)

test('a replacement requires a fresh swap and receipt even with a persisted failed status', async () => {
  const client = backend()
  const result = await reconcile(client, { transaction: { hash: '0xinput', status: 'failed' } })
  assert.equal(result.canRestart, false)
  assert.deepEqual(client.calls, [['swap', 'A', 'source'], ['receipt', 'BASE', '0xinput']])
})

test('failure of the recorded hash releases that transaction and its uncertainty marker', async () => {
  const result = await reconcile(backend({ receipt: 'Failed' }), {
    transaction: { hash: '0xinput', status: 'pending' }, submissionPending: true,
  })
  assert.equal(result.canRestart, true)
  assert.equal(result.transactionStatus, 'failed')
})

test('a failed authorization cannot release a hash whose fresh receipt is still pending', async () => {
  const client = backend({ actions: [{ ...sign, status: 'completed' }], authorization: { status: 'expired' } })
  assert.equal((await reconcile(client, { transaction: { hash: '0xinput', status: 'failed' }, signature: { validBefore: 1 } })).canRestart, false)
})

for (const status of ['expired', 'insufficient', 'rejected']) {
  test(`backend ${status} clears signature uncertainty before retry`, async () => {
    const client = backend({ actions: [{ ...sign, status: 'completed' }], authorization: { status } })
    assert.equal((await reconcile(client, { signature: { validBefore: 1 }, submissionPending: true })).canRestart, true)
    assert.deepEqual(client.calls, [['swap', 'A', 'source'], ['authorize', 'A']])
  })
}

test('a browser deadline and legacy terminal status cannot permit abandoning an initiated authorization', async () => {
  const client = backend({ actions: [{ ...sign, status: 'completed' }] })
  assert.equal((await reconcile(client, { authorization: { validBefore: 1, status: 'expired' } })).canRestart, false)
})

for (const status of ['published', 'completed']) {
  test(`current ${status} authorization protects progress before the input hash is indexed`, async () => {
    assert.equal((await reconcile(backend({ actions: [sign], authorization: { status } }))).canRestart, false)
  })
}

test('backend authorization acceptance blocks replacement without any local records or hash', async () => {
  const client = backend({ actions: [sign], authorization: { status: 'initiated' } })
  const result = await reconcile(client)
  assert.equal(result.canRestart, false, 'accepted authorization can still publish after an actionable sign snapshot')
  assert.equal(result.authorization.status, 'initiated')
  assert.deepEqual(client.calls, [['swap', 'A', 'source'], ['authorize', 'A']])
})

test('an initiated authorization cannot be replaced after an earlier transaction failed', async () => {
  const client = backend({ actions: [sign], authorization: { status: 'initiated' }, receipt: 'failed' })
  assert.equal((await reconcile(client, { transaction: { hash: 'earlier', status: 'failed' } })).canRestart, false)
})

test('an unknown authorization response cannot authorize replacement', async () => {
  await assert.rejects(reconcile(backend({ actions: [sign], authorization: { status: 'unknown' } })), /authorization status/)
})

test('a missing authorization is safe only before signing was accepted', async () => {
  const client = backend({ actions: [sign] })
  const notFound = Object.assign(new Error('Not found'), { response: { status: 404 } })
  client.GetGaslessAuthorizationAsync = async () => { throw notFound }
  assert.equal((await reconcile(client)).canRestart, true)
  await assert.rejects(reconcile(client, { signature: { validBefore: 1 } }), error => error === notFound)
  await assert.rejects(reconcile(client, { submissionPending: true }), error => error === notFound)
})

test('a backend outage or unresolved receipt never permits retry', async () => {
  const client = backend()
  client.GetSwapAsync = async () => { throw new Error('Swap unavailable') }
  await assert.rejects(reconcile(client), /Swap unavailable/)
  client.GetSwapAsync = backend().GetSwapAsync
  client.GetTransactionStatus = async () => ({ data: { status: 'unknown' } })
  await assert.rejects(reconcile(client, { transaction: { hash: '0xinput' } }), /transaction outcome/)
})

test('an unknown provider submission stays protected even when an unrelated input failed', async () => {
  const client = backend({ transactions: [{ type: 'input', status: 'failed', transaction_hash: 'other' }] })
  assert.equal((await reconcile(client, { submissionPending: true })).canRestart, false)
})

test('an unindexed backend input and advanced swap status protect against replacement', async () => {
  assert.equal((await reconcile(backend({ transactions: [{ type: 'input', status: 'pending', transaction_hash: '' }] }))).canRestart, false)
  assert.equal((await reconcile(backend({ status: 'completed' }))).canRestart, false)
})

test('a changed swap or missing action snapshot cannot authorize cleanup', async () => {
  const client = backend()
  client.GetSwapAsync = async () => ({ data: { swap: { id: 'B', status: 'completed' }, deposit_actions: [] } })
  await assert.rejects(reconcile(client), /transfer status/)
  client.GetSwapAsync = async () => ({ data: { swap: { id: 'A' } } })
  await assert.rejects(reconcile(client), /transfer status/)
})

for (const [progress, snapshot] of [
  ['completed swap', { status: 'completed' }],
  ['live input transaction', { transactions: [{ type: 'input', status: 'pending', transaction_hash: '0xinput' }] }],
]) {
  test(`a ${progress} reconciles without optional deposit actions or auxiliary reads`, async () => {
    const client = backend({ ...snapshot, omitActions: true })
    const result = await reconcile(client, { transaction: { hash: 'unindexed', status: 'failed' }, submissionPending: true })
    assert.equal(result.canRestart, false)
    assert.equal(result.response.data.swap.id, 'A')
    assert.equal(result.response.data.deposit_actions, undefined)
    assert.deepEqual(client.calls, [['swap', 'A', 'source']])
  })
}

test('the shared lock covers reconciliation and cleanup and releases after errors', async () => {
  const paused = Promise.withResolvers()
  const pending = withSwapReconciliation('A', () => paused.promise)
  await assert.rejects(withSwapReconciliation('A', async () => {}), /already being checked/)
  paused.reject(new Error('Unavailable'))
  await assert.rejects(pending, /Unavailable/)
  assert.equal(await withSwapReconciliation('A', async () => 'ready'), 'ready')
})

test('every retained hash must fail before recovery evidence can be cleared', async () => {
  const client = backend({ actions: [sign], authorization: { status: 'expired' } })
  client.GetTransactionStatus = async (network, hash) => ({ data: { status: hash === 'wallet' ? 'failed' : 'pending' } })
  const evidence = {
    transaction: { hash: 'wallet', status: 'failed' },
    authorization: { validBefore: 1, transaction: { transaction_hash: 'legacy-gasless', status: 'failed' } },
  }
  assert.equal((await reconcile(client, evidence)).canRestart, false)
  client.GetTransactionStatus = async () => ({ data: { status: 'failed' } })
  assert.equal((await reconcile(client, evidence)).canRestart, true)
})

test('accepted backend progress remains visible when an auxiliary receipt is unavailable', async () => {
  const client = backend({ status: 'completed' })
  client.GetTransactionStatus = async () => { assert.fail('a completed backend swap cannot be replaced') }
  assert.equal((await reconcile(client, { transaction: { hash: 'unindexed' } })).canRestart, false)
})

test('backend acceptance overrides a missing authorization observation', async () => {
  const client = backend({ actions: [{ ...sign, status: 'completed' }], status: 'completed' })
  client.GetGaslessAuthorizationAsync = async () => { throw new Error('Authorization unavailable') }
  assert.equal((await reconcile(client, { signature: { validBefore: 1 } })).canRestart, false)
  assert.deepEqual(client.calls, [['swap', 'A', 'source']])
})
