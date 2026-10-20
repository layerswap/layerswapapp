import assert from 'node:assert/strict'
import test, { after, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'

const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
const storage = new Map()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
} })
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    if (specifier.endsWith('/lib/apiClients/layerSwapApiClient')) {
        return { url: 'data:text/javascript,' + encodeURIComponent(`
            export const TransactionType = { Input: 'input' }
            export const BackendTransactionStatus = { Pending: 'pending', Completed: 'completed', Failed: 'failed' }
        `), shortCircuit: true }
    }
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
        return nextResolve(`${specifier}.js`, context)
    }
    return nextResolve(specifier, context)
} })
const { recordSwapExecution } = await import('../dist/esm/lib/swapExecution.js')
const { useSwapTransactionStore: store } = await import('../dist/esm/stores/swapTransactionStore.js')
const { resolveSwapFlow } = await import('../dist/esm/components/utils/resolveSwapFlow.js')
const { shouldDisplay } = await import('../dist/esm/components/Pages/SwapHistory/Filters/filterSwaps.js')
beforeEach(() => {
    storage.clear()
    store.setState(store.getInitialState(), true)
})
after(() => {
    hooks.deregister()
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage)
    else delete globalThis.localStorage
})

for (const [kind, actions] of [
    ['wallet-transfer', [{ type: 'transfer', step: 'deposit' }]],
    ['frontend-swap', [{ step: 'sign' }, { step: 'publish' }]],
    ['atomic-batch', [{ type: 'send_calls', step: 'publish' }]],
    ['gasless-deposit', [{ type: 'sign', signing_standard: 'permit2' }]],
]) {
    test(`${kind} recovers from persisted backend identity when action history disappears`, async () => {
        recordSwapExecution('swap', { depositActions: actions })
        assert.deepEqual(store.getState().swapTransactions.swap, { kind })
        recordSwapExecution('swap', { depositActions: [{ type: 'sign', step: 'sign' }] })
        recordSwapExecution('swap', {})
        const saved = storage.get('swapTransactions')
        store.setState(store.getInitialState(), true)
        storage.set('swapTransactions', saved)
        await store.persist.rehydrate()
        const transaction = store.getState().swapTransactions.swap
        assert.deepEqual(transaction, { kind })
        assert.equal(resolveSwapFlow({ transaction }).kind, kind)
        assert.equal(resolveSwapFlow({}).kind, 'unresolved', 'a different swap cannot inherit the kind')
    })
}

test('backend identity upgrades legacy receipts without changing transaction or step history', () => {
    store.getState().setSwapTransaction('swap', 'execution')
    const timestamp = store.getState().swapTransactions.swap.timestamp
    store.getState().setStepTransaction('swap', 'approve_permit2', 'approval', 'https://explorer.test/approval')
    const steps = store.getState().stepTransactions
    recordSwapExecution('swap', { depositActions: [{ type: 'send_calls', step: 'publish' }] })
    assert.deepEqual(store.getState().swapTransactions.swap, { kind: 'atomic-batch', hash: 'execution', timestamp })
    assert.equal(store.getState().stepTransactions, steps)
    const transaction = store.getState().swapTransactions.swap
    recordSwapExecution('swap', {})
    assert.equal(store.getState().swapTransactions.swap, transaction, 'incomplete reads do not rewrite identity')
})

test('history requires submission evidence, not just a saved execution kind', () => {
    for (const kind of ['wallet-transfer', 'frontend-swap', 'atomic-batch', 'gasless-deposit']) {
        const response = { swap: { id: 'swap', status: 'user_transfer_pending', transactions: [] } }
        assert.equal(shouldDisplay(response, { swap: { kind } }), false)
        assert.equal(shouldDisplay(response, { swap: { kind, hash: 'execution', timestamp: 1 } }), true)
        assert.equal(shouldDisplay({ swap: { ...response.swap, transactions: [{ type: 'input' }] } }, { swap: { kind } }), true)
    }
    assert.equal(shouldDisplay({ swap: { id: 'swap', status: 'user_transfer_pending', transactions: [] } }, {
        swap: { kind: 'atomic-batch', batch: { attempt: 'original' }, timestamp: 1 },
    }), false)
    assert.equal(shouldDisplay({ swap: { id: 'swap', status: 'user_transfer_pending', transactions: [] } }, {
        swap: { kind: 'wallet-transfer', providerSubmissionAccepted: true, timestamp: 1 },
    }), true)
})

const atomicSwap = transactions => ({
    id: 'swap', source_network: { type: 'evm', name: 'BASE_MAINNET' },
    source_token: { symbol: 'USDC', contract: `0x${'1'.repeat(40)}` }, transactions,
})
const inputHash = `0x${'a'.repeat(64)}`

for (const status of ['pending', 'completed']) {
    test(`a backend ${status} atomic input resolves a persisted unknown submission without action history`, async () => {
        store.getState().setSwapTransactionKind('swap', 'atomic-batch')
        store.getState().markSubmissionPending('swap')
        store.getState().markSubmissionPending('another-swap')
        const saved = storage.get('swapTransactions')
        store.setState(store.getInitialState(), true)
        storage.set('swapTransactions', saved)
        await store.persist.rehydrate()

        recordSwapExecution('swap', { swapData: atomicSwap([{ type: 'input', status, transaction_hash: inputHash }]) })
        assert.equal(store.getState().swapTransactions.swap.hash, inputHash)
        assert.equal(store.getState().swapTransactions.swap.kind, 'atomic-batch')
        assert.deepEqual(store.getState().pendingSubmissions, { 'another-swap': true })
        const receipt = store.getState().swapTransactions.swap
        recordSwapExecution('swap', { swapData: atomicSwap([{ type: 'input', status, transaction_hash: inputHash }]) })
        assert.equal(store.getState().swapTransactions.swap, receipt, 'later polls retain the original receipt')
    })
}

for (const [name, transactions] of [
    ['absent input', []],
    ['failed input', [{ type: 'input', status: 'failed', transaction_hash: inputHash }]],
    ['unsigned input', [{ type: 'input', status: 'initiated', transaction_hash: inputHash }]],
    ['output only', [{ type: 'output', status: 'completed', transaction_hash: inputHash }]],
    ['invalid input hash', [{ type: 'input', status: 'pending', transaction_hash: 'invalid' }]],
]) {
    test(`${name} cannot release an unknown atomic submission`, () => {
        store.getState().setSwapTransactionKind('swap', 'atomic-batch')
        store.getState().markSubmissionPending('swap')
        recordSwapExecution('swap', { swapData: atomicSwap(transactions) })
        assert.equal(store.getState().pendingSubmissions.swap, true)
        assert.deepEqual(store.getState().swapTransactions.swap, { kind: 'atomic-batch' })
    })
}

test('a different swap or execution lane cannot clear an uncertain submission', () => {
    store.getState().setSwapTransactionKind('swap', 'atomic-batch')
    store.getState().markSubmissionPending('swap')
    const swapData = atomicSwap([{ type: 'input', status: 'completed', transaction_hash: inputHash }])
    recordSwapExecution('swap', { swapData: { ...swapData, id: 'another-swap' } })
    assert.equal(store.getState().pendingSubmissions.swap, true)

    store.getState().setSwapTransactionKind('swap', 'wallet-transfer')
    recordSwapExecution('swap', { swapData })
    assert.equal(store.getState().pendingSubmissions.swap, true, 'provider withdrawals retain their own reconciliation policy')
})
