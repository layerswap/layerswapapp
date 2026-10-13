import assert from 'node:assert/strict'
import test, { after, beforeEach } from 'node:test'

const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
const storage = new Map()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
} })
const { useSwapTransactionStore: store, useGaslessAuthorizationStore: gasless } = await import('../dist/esm/stores/swapTransactionStore.js')
beforeEach(() => {
    storage.clear()
    store.setState(store.getInitialState(), true)
    gasless.setState(gasless.getInitialState(), true)
})
after(() => {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage)
    else delete globalThis.localStorage
})

test('legacy transaction outcomes are stripped and empty execution placeholders are discarded', async () => {
    const swapTransactions = {
        pending: { hash: 'pending-hash', status: 'pending', timestamp: 10 },
        failed: { hash: 'failed-hash', status: 'failed', failReason: 'reverted', timestamp: 20 },
        gasless: { hash: '', status: 'pending', timestamp: 30 },
    }
    const legacy = { state: { swapTransactions, pendingSubmissions: { uncertain: true } }, version: 0 }
    storage.set('swapTransactions', JSON.stringify(legacy))
    await store.persist.rehydrate()
    const receipts = {
        pending: { hash: 'pending-hash', timestamp: 10 },
        failed: { hash: 'failed-hash', timestamp: 20 },
    }
    assert.deepEqual(store.getState().swapTransactions, receipts)
    assert.deepEqual(store.getState().pendingSubmissions, { uncertain: true })
    assert.deepEqual(store.getState().stepTransactions, {})

    store.getState().setStepTransaction('pending', 'approve_permit2', 'approval', 'https://explorer.test/tx/approval')
    const persisted = JSON.parse(storage.get('swapTransactions'))
    assert.deepEqual(persisted.state.swapTransactions, receipts)
    assert.deepEqual(persisted.state.pendingSubmissions, legacy.state.pendingSubmissions)
})

test('approvals persist independently without submitting the swap or clearing unknown submissions', async () => {
    store.getState().markSubmissionPending('swap-1')
    store.getState().setStepTransaction('swap-1', 'approve_permit2', 'approval-1', 'https://explorer.test/tx/approval-1')
    store.getState().setStepTransaction('swap-1', 'approve_token', 'approval-2', 'https://explorer.test/tx/approval-2')
    store.getState().setStepTransaction('swap-2', 'approve_permit2', 'approval-3', 'https://other.test/tx/approval-3')
    const saved = store.getState().stepTransactions
    assert.deepEqual(Object.keys(saved['swap-1']), ['approve_permit2', 'approve_token'])
    assert.deepEqual(store.getState().swapTransactions, {}, 'approval-only swaps have no execution record')
    assert.deepEqual(store.getState().pendingSubmissions, { 'swap-1': true })

    const persisted = storage.get('swapTransactions')
    store.setState(store.getInitialState(), true)
    storage.set('swapTransactions', persisted)
    await store.persist.rehydrate()
    assert.deepEqual(store.getState().stepTransactions, saved)
    assert.deepEqual(store.getState().swapTransactions, {})
    assert.deepEqual(store.getState().pendingSubmissions, { 'swap-1': true })
})

test('repeated execution receipts retain their original timestamp and preserve approval receipts', () => {
    store.getState().setSwapTransaction('swap-1', 'execution')
    const execution = store.getState().swapTransactions['swap-1']
    store.getState().markSubmissionPending('swap-1')
    store.getState().markSubmissionPending('swap-2')
    store.getState().setStepTransaction('swap-1', 'approve_permit2', 'approval', 'https://explorer.test/tx/approval')
    assert.equal(store.getState().swapTransactions['swap-1'], execution, 'approval cannot replace or retimestamp execution')
    const approvals = store.getState().stepTransactions

    store.getState().setSwapTransaction('swap-1', 'execution')
    assert.deepEqual(store.getState().pendingSubmissions, { 'swap-2': true }, 'execution still clears only its own submission marker')
    assert.deepEqual(store.getState().swapTransactions['swap-1'], execution)
    assert.deepEqual(Object.keys(store.getState().swapTransactions['swap-1']), ['hash', 'timestamp'])
    assert.equal(store.getState().stepTransactions, approvals)
    store.getState().removeSwapTransaction('swap-1')
    assert.deepEqual(store.getState().swapTransactions, {})
    assert.equal(store.getState().stepTransactions, approvals, 'retrying execution preserves prerequisite receipts')
    assert.deepEqual(store.getState().pendingSubmissions, { 'swap-2': true })
})

test('empty transaction hashes cannot submit a swap or resolve an unknown wallet request', () => {
    store.getState().markSubmissionPending('swap-1')
    store.getState().setSwapTransaction('swap-1', '')
    store.getState().setSwapTransaction('swap-1', '   ')
    assert.deepEqual(store.getState().swapTransactions, {})
    assert.deepEqual(store.getState().pendingSubmissions, { 'swap-1': true })
})

test('legacy gasless outcomes hydrate and persist only their signed-action receipt', async () => {
    storage.set('gaslessAuthorizations', JSON.stringify({ state: { authorizations: {
        gasless: { kind: 'gasless', validBefore: 123, status: 'expired', transaction: { transaction_hash: '0xold', status: 'failed' } },
        unclassified: { validBefore: 456, status: 'completed' },
        invalid: { status: 'expired' },
    } }, version: 0 }))
    await gasless.persist.rehydrate()
    const receipts = {
        gasless: { kind: 'gasless', validBefore: 123 },
        unclassified: { validBefore: 456 },
    }
    assert.deepEqual(gasless.getState().authorizations, receipts)
    gasless.getState().setGaslessAuthorization('new', 789)
    assert.deepEqual(JSON.parse(storage.get('gaslessAuthorizations')).state.authorizations, {
        ...receipts, new: { kind: 'gasless', validBefore: 789 },
    })
    assert.equal(gasless.getState().setGaslessAuthorizationStatus, undefined)
})

test('replacing an approval affects only that swap and step, and empty hashes are ignored', () => {
    store.getState().setStepTransaction('swap-1', 'approve_permit2', 'old', 'https://explorer.test/tx/old')
    store.getState().setStepTransaction('swap-1', 'approve_token', 'token', 'https://explorer.test/tx/token')
    store.getState().setStepTransaction('swap-2', 'approve_permit2', 'other', 'https://explorer.test/tx/other')
    const previous = store.getState().stepTransactions
    store.getState().setStepTransaction('swap-1', 'approve_permit2', 'new', 'https://explorer.test/tx/new')
    assert.equal(store.getState().stepTransactions['swap-1'].approve_permit2.hash, 'new')
    assert.equal(store.getState().stepTransactions['swap-1'].approve_token, previous['swap-1'].approve_token)
    assert.equal(store.getState().stepTransactions['swap-2'], previous['swap-2'])
    const current = store.getState().stepTransactions
    store.getState().setStepTransaction('swap-1', 'approve_permit2', '', '')
    assert.equal(store.getState().stepTransactions, current)
})
