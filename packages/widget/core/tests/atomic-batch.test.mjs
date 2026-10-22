import assert from 'node:assert/strict'
import test, { after, afterEach } from 'node:test'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'

const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
const storage = new Map()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
} })
const apiUrl = `data:text/javascript,${encodeURIComponent(`
    export const BackendTransactionStatus = { Pending: 'pending', Failed: 'failed', Completed: 'completed' }
    export const TransactionType = { Input: 'input' }
`)}`
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    if (specifier.endsWith('/lib/ErrorHandler')) return { url: 'data:text/javascript,export function ErrorHandler() {}', shortCircuit: true }
    if (specifier.endsWith('/lib/apiClients/layerSwapApiClient')) return { url: apiUrl, shortCircuit: true }
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) return nextResolve(`${specifier}.js`, context)
    return nextResolve(specifier, context)
} })
const { getAtomicBatchExpiry, validateAtomicBatch, isAtomicBatchEligible } = await import('../dist/esm/helpers/atomicBatch.js')
const { getActionableDepositAction, getDepositActionLabel, getDepositActionDescription } = await import('../dist/esm/helpers/depositActions.js')
const { executeAtomicBatch } = await import('../dist/esm/lib/atomicBatchExecution.js')
const { recordSwapExecution } = await import('../dist/esm/lib/swapExecution.js')
const { hasUnacknowledgedWalletAction } = await import('../dist/esm/helpers/swapProgress.js')
const { shouldDisplay } = await import('../dist/esm/components/Pages/SwapHistory/Filters/filterSwaps.js')
const { useSwapTransactionStore: store } = await import('../dist/esm/stores/swapTransactionStore.js')
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/atomic-batch.json', import.meta.url)))
const hash = `0x${'a'.repeat(64)}`, finalHash = `0x${'b'.repeat(64)}`
const batchId = 'wallet-batch-id-that-is-not-a-hash'
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve() }
afterEach(() => {
    storage.clear()
    store.setState(store.getInitialState(), true)
})
after(() => {
    hooks.deregister()
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage)
    else delete globalThis.localStorage
})

function context(action = fixtures.actions.zero_allowance) {
    const events = [], catchups = []
    let successes = 0
    return { swapData: { id: 'atomic-swap', source_address: fixtures.account }, swapBasicData: fixtures.swap,
        selectedWallet: { id: 'Original', providerName: 'evm', internalId: 'original', address: fixtures.account,
            addresses: [fixtures.account], chainId: 42161, metadata: { connectorId: 'original' } },
        sourceAddress: fixtures.account, depositActions: [action], setActionStateText() {},
        setSwapTransaction: store.getState().setSwapTransaction,
        layerswapApiClient: { SwapCatchup: async (...args) => { catchups.push(args) } },
        onLifecycle: event => events.push(event), onSuccess: () => { successes++ },
        events, catchups, get successes() { return successes } }
}
const submit = (ctx = context(), provider = {}) => executeAtomicBatch(ctx, ctx.depositActions[0], {
    submit: async () => ({ id: batchId }), getStatus: async () => assert.fail('Backend observation must not poll the wallet'), ...provider,
})

test('an uncertain atomic submission stays in history after hydration without enabling resubmission', async () => {
    const ctx = context()
    await assert.rejects(submit(ctx, { submit: async () => { throw new Error('Wallet response lost') } }), /Wallet response lost/)
    const saved = storage.get('swapTransactions')
    store.setState(store.getInitialState(), true)
    storage.set('swapTransactions', saved)
    await store.persist.rehydrate()

    const state = store.getState()
    const response = { swap: { ...ctx.swapData, status: 'user_transfer_pending', transactions: [] } }
    assert.equal(state.swapTransactions['atomic-swap'].timestamp, undefined)
    assert.equal(shouldDisplay(response, state.swapTransactions, state.pendingSubmissions), true)
    assert.equal(shouldDisplay({ swap: { ...response.swap, id: 'untouched' } }, {
        untouched: { kind: 'atomic-batch' },
    }, state.pendingSubmissions), false)
    await assert.rejects(submit(ctx, {
        submit: async () => assert.fail('reopening an uncertain submission must never send again'),
    }), /may already be submitted/)
    assert.equal(store.getState().pendingSubmissions['atomic-swap'], true)
})

for (const [name, action] of Object.entries(fixtures.actions).filter(([, action]) => action.calls.length > 1)) test(`preserves backend calls and hands accepted batches to backend tracking: ${name}`, async () => {
    const ctx = context(action)
    const needsApproval = ['zero_allowance', 'allowance_reset'].includes(name)
    const expectedLabel = needsApproval ? 'Approve and swap' : 'Confirm swap'
    const descriptions = []
    ctx.setActionStateText = text => descriptions.push(text)
    await submit(ctx, { submit: async request => {
        assert.deepEqual(descriptions, [`${expectedLabel} in your wallet`])
        assert.deepEqual(request.calls.map(call => call.to), action.calls.map(call => call.to))
        assert.deepEqual(request.calls.map(call => call.data), action.calls.map(call => call.data))
        assert.deepEqual(request.calls.map(call => call.value), action.calls.map(call => BigInt(call.value)))
        assert.deepEqual(store.getState().swapTransactions['atomic-swap'], { kind: 'atomic-batch' })
        assert.deepEqual(store.getState().pendingSubmissions, { 'atomic-swap': true })
        return { id: batchId }
    } })
    assert.equal(getActionableDepositAction([action]), action)
    assert.equal(getDepositActionLabel(action), expectedLabel)
    assert.equal(getDepositActionDescription(action), needsApproval
        ? 'Approve the token and swap in one atomic batch' : 'Submit the swap transaction')
    const transaction = store.getState().swapTransactions['atomic-swap']
    assert.deepEqual(transaction, { kind: 'atomic-batch', providerSubmissionAccepted: true, timestamp: transaction.timestamp,
        atomicBatch: { id: batchId } })
    assert.deepEqual(store.getState().stepTransactions, {}, 'a wallet batch ID cannot become a transaction link')
    assert.equal(ctx.successes, 1, 'wallet execution releases without waiting for mining')
    assert.deepEqual(store.getState().pendingSubmissions, {})
    assert.deepEqual(ctx.catchups, [], 'catchup requires a transaction hash, not the wallet batch ID')
    assert.equal(ctx.events[0].step, 'transaction_submitted')
    assert.equal(ctx.events[0].transactionHash, undefined)
    assert.ok(JSON.stringify([...storage]).includes(batchId), 'retain the opaque ID without turning it into a transaction hash')
})

test('validates sender, chain, expiry, address, calldata and integer values before submission', () => {
    for (const change of [
        { from_address: `0x${'4'.repeat(40)}` }, { network: { ...fixtures.network, chain_id: '1' } },
        { valid_before: 1 }, { type: 'transfer' }, { status: 'waiting' }, { calls: [] },
        { valid_before: undefined, expires_at: undefined }, { expires_at: 'invalid' },
        { valid_before: 2000000000.5 }, { valid_before: '2000000000' }, { valid_before: null },
        ...['-1', '1.1', '1e18', '0x', 9007199254740993, '01', `0x${(2n ** 256n).toString(16)}`].map(value => ({ calls: [{ ...fixtures.actions.sufficient_allowance.calls[0], value }] })),
        { calls: [{ ...fixtures.actions.sufficient_allowance.calls[0], to: '0x123' }] },
        { calls: [{ ...fixtures.actions.sufficient_allowance.calls[0], data: '0x123' }] },
    ]) assert.throws(() => validateAtomicBatch({ ...fixtures.actions.zero_allowance, ...change }, fixtures.swap, fixtures.account, fixtures.account))
})

test('accepts the API action expiry five seconds before its transaction deadline', () => {
    assert.equal(getAtomicBatchExpiry({ valid_before: 1792511077, expires_at: '2026-10-20T15:44:32+00:00' }), 1792511072)
})

test('submits with the earlier cutoff while preserving the backend calldata', async () => {
    const validBefore = 2000000000
    const action = { ...fixtures.actions.zero_allowance, valid_before: validBefore,
        expires_at: new Date((validBefore - 5) * 1000).toISOString() }
    const ctx = context(action)
    let submissions = 0
    await submit(ctx, { submit: async request => {
        submissions++
        assert.equal(request.validBefore, validBefore - 5)
        assert.deepEqual(request.calls.map(call => call.data), action.calls.map(call => call.data))
        return { id: batchId }
    } })
    assert.equal(submissions, 1)
    assert.equal(ctx.successes, 1)
})

for (const earlier of ['expires_at', 'valid_before']) test(`rejects a batch when only ${earlier} has expired`, () => {
    const now = 1792511073
    const action = { ...fixtures.actions.zero_allowance,
        valid_before: earlier === 'valid_before' ? now - 1 : now + 4,
        expires_at: new Date((earlier === 'expires_at' ? now - 1 : now + 4) * 1000).toISOString() }
    assert.throws(() => validateAtomicBatch(action, fixtures.swap, fixtures.account, fixtures.account, now * 1000), /Batch expired/)
})

test('supports either expiry field on its own and uses the earlier transaction deadline', () => {
    assert.equal(getAtomicBatchExpiry({ valid_before: 2000000000 }), 2000000000)
    assert.equal(getAtomicBatchExpiry({ expires_at: '2033-05-18T03:33:20Z' }), 2000000000)
    assert.equal(getAtomicBatchExpiry({ valid_before: 1999999995, expires_at: '2033-05-18T03:33:20Z' }), 1999999995)
})

for (const validBefore of [undefined, 1999999995, 2000000005]) {
    test(`fractional ISO expiry is accepted with transaction deadline ${validBefore}`, async () => {
        const action = { ...fixtures.actions.zero_allowance, valid_before: validBefore,
            expires_at: '2033-05-18T03:33:20.1234567Z' }
        const expected = Math.min(validBefore ?? Infinity, 2000000000)
        assert.equal(getAtomicBatchExpiry(action), expected)
        const ctx = context(action)
        await submit(ctx, { submit: async request => {
            assert.equal(request.validBefore, expected)
            return { id: batchId }
        } })
        assert.equal(ctx.successes, 1)
        assert.throws(() => validateAtomicBatch(action, fixtures.swap, fixtures.account, fixtures.account, expected * 1000), /Batch expired/)
    })
}

test('backend swap sender remains mandatory when the send_calls payload omits sender and chain', () => {
    const action = { ...fixtures.actions.sufficient_allowance, from_address: undefined, network: undefined }
    assert.equal(validateAtomicBatch(action, fixtures.swap, fixtures.account, fixtures.account).length, 1)
    for (const account of [undefined, 'invalid', `0x${'4'.repeat(40)}`]) {
        assert.throws(() => validateAtomicBatch(action, fixtures.swap, fixtures.account, account), /sender/)
    }
})

test('native, gasless, deposit-address and extended sources keep their existing lane', () => {
    const input = { network: fixtures.network, token: fixtures.token, depositMethod: 'wallet', useGasless: false,
        sourceIsSupported: true, sourceAddress: fixtures.account }
    assert.equal(isAtomicBatchEligible(input), true)
    for (const change of [{ token: { contract: null } }, { useGasless: true }, { depositMethod: 'deposit_address' },
        { network: { type: 'svm' } }, { sourceExchange: {} }, { extended: true }, { sourceIsSupported: false }]) {
        assert.equal(isAtomicBatchEligible({ ...input, ...change }), false)
    }
    const legacy = { type: 'transfer', step: 'publish', status: 'action_required' }
    assert.equal(getActionableDepositAction([legacy]), legacy)
    assert.equal(getDepositActionLabel(legacy), 'Confirm swap')
})

test('a saved atomic kind allows submission without browser coordination', async () => {
    store.getState().setSwapTransactionKind('atomic-swap', 'atomic-batch')
    await submit()
    assert.equal(store.getState().swapTransactions['atomic-swap'].providerSubmissionAccepted, true)
    assert.equal(store.getState().swapTransactions['atomic-swap'].hash, undefined)
})

test('accepted batches never send wallet status requests after submission or completion', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const ctx = context()
    let polls = 0
    await submit(ctx, { getStatus: async () => { polls++; return {} } })
    assert.equal(ctx.successes, 1)
    assert.equal(store.getState().swapTransactions['atomic-swap'].providerSubmissionAccepted, true)
    t.mock.timers.tick(120_000)
    await flush()
    assert.equal(polls, 0)
    assert.deepEqual(ctx.catchups, [])
})

for (const [name, error] of [
    ['rejection', { code: 4001 }], ['proven non-submission', { atomicSubmission: 'not_submitted' }],
]) test(`${name} releases the pending marker and permits retry`, async () => {
    const ctx = context()
    await assert.rejects(submit(ctx, { submit: async () => { throw error } }))
    assert.deepEqual(store.getState().swapTransactions['atomic-swap'], { kind: 'atomic-batch' })
    assert.deepEqual(store.getState().pendingSubmissions, {})
    assert.equal(ctx.successes, 0)
    assert.deepEqual(ctx.catchups, [])
    await submit(ctx)
    assert.equal(ctx.successes, 1)
})

test('a lost response preserves deduplication after reload and blocks another wallet request', async () => {
    const ctx = context()
    await assert.rejects(submit(ctx, { submit: async () => { throw new Error('Connection lost') } }), /Connection lost/)
    const saved = storage.get('swapTransactions')
    store.setState(store.getInitialState(), true)
    storage.set('swapTransactions', saved)
    await store.persist.rehydrate()
    assert.equal(store.getState().pendingSubmissions['atomic-swap'], true)
    assert.equal(hasUnacknowledgedWalletAction({
        transaction: store.getState().swapTransactions['atomic-swap'],
        pendingSubmission: store.getState().pendingSubmissions['atomic-swap'],
        depositActions: ctx.depositActions,
    }), true)
    await assert.rejects(submit(context(), { submit: () => assert.fail('An uncertain submission cannot open the wallet again') }), /may already be submitted/)
    assert.ok(!saved.includes(batchId))
    assert.equal(ctx.successes, 0)
})

test('an accepted batch survives reload and cannot resubmit before backend detection', async () => {
    await submit()
    const saved = storage.get('swapTransactions')
    store.setState(store.getInitialState(), true)
    storage.set('swapTransactions', saved)
    await store.persist.rehydrate()
    const transaction = store.getState().swapTransactions['atomic-swap']
    assert.equal(transaction.providerSubmissionAccepted, true)
    assert.equal(transaction.hash, undefined)
    assert.equal(transaction.atomicBatch.id, batchId)
    assert.equal(hasUnacknowledgedWalletAction({ transaction }), true)
    await assert.rejects(submit(context(), { submit: () => assert.fail('An accepted batch cannot be sent twice') }), /may already be submitted/)
})

test('same-swap requests are guarded while independent swaps can submit', async () => {
    const first = context()
    const accepted = Promise.withResolvers()
    const pending = submit(first, { submit: () => accepted.promise })
    try {
        await assert.rejects(submit(context(), { submit: () => assert.fail('Duplicate submission') }), /may already be submitted/)
        const independent = context()
        independent.swapData.id = 'another-swap'
        await submit(independent)
        assert.equal(independent.successes, 1)
        assert.deepEqual(store.getState().pendingSubmissions, { 'atomic-swap': true })
        accepted.resolve({ id: batchId })
        await pending
        assert.equal(first.successes, 1)
        assert.deepEqual(store.getState().pendingSubmissions, {})
        await assert.rejects(submit(context()), /may already be submitted/)
    } finally {
        accepted.resolve({ id: batchId })
        await pending
    }
})

for (const result of [{}, { id: '' }, { id: ' ' }, null]) {
    test(`a malformed wallet response remains uncertain: ${JSON.stringify(result)}`, async () => {
        const ctx = context()
        await assert.rejects(submit(ctx, { submit: async () => result }), /no batch ID/)
        assert.deepEqual(store.getState().swapTransactions['atomic-swap'], { kind: 'atomic-batch' })
        assert.equal(store.getState().pendingSubmissions['atomic-swap'], true)
        assert.equal(ctx.successes, 0)
    })
}

test('an accepted submission is retained after the screen closes without reopening the wallet', async () => {
    const ctx = context(), controller = new AbortController()
    ctx.signal = controller.signal
    const accepted = Promise.withResolvers()
    const pending = submit(ctx, { submit: () => accepted.promise })
    await flush()
    controller.abort()
    ctx.selectedWallet = { address: 'another-account' }
    accepted.resolve({ id: batchId })
    await pending
    assert.equal(store.getState().swapTransactions['atomic-swap'].providerSubmissionAccepted, true)
    assert.equal(store.getState().swapTransactions['atomic-swap'].hash, undefined)
})

test('backend detection before the wallet responds retains the real hash', async () => {
    const ctx = context()
    await submit(ctx, { submit: async () => {
        store.getState().setSwapTransaction('atomic-swap', hash, 'atomic-batch')
        return { id: batchId }
    } })
    assert.equal(store.getState().swapTransactions['atomic-swap'].hash, hash)
    assert.equal(store.getState().swapTransactions['atomic-swap'].providerSubmissionAccepted, undefined)
    assert.equal(ctx.events[0].transactionHash, hash)
})

test('a throwing lifecycle observer cannot undo an accepted batch or block the UI handoff', async () => {
    const ctx = context()
    ctx.onLifecycle = event => {
        ctx.events.push(event)
        throw new Error('Host observer failed')
    }
    await submit(ctx)
    assert.equal(ctx.successes, 1)
    assert.equal(store.getState().swapTransactions['atomic-swap'].providerSubmissionAccepted, true)
    assert.deepEqual(ctx.catchups, [])
    assert.deepEqual(ctx.events.map(event => event.step), ['transaction_submitted'])
})

test('one call never enters wallet batch submission', async () => {
    const ctx = context(fixtures.actions.sufficient_allowance)
    await assert.rejects(submit(ctx, { submit: () => assert.fail('must use a regular transaction') }), /single call/)
    assert.deepEqual(store.getState().pendingSubmissions, {})
})

test('backend input detection after a long wait and reload replaces the opaque batch ID with the real hash', async t => {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'] })
    const ctx = context()
    await submit(ctx)
    const timestamp = store.getState().swapTransactions['atomic-swap'].timestamp
    const saved = storage.get('swapTransactions')
    store.setState(store.getInitialState(), true)
    storage.set('swapTransactions', saved)
    await store.persist.rehydrate()
    t.mock.timers.tick(180_000)
    const accepted = store.getState().swapTransactions['atomic-swap']
    assert.equal(accepted.timestamp, timestamp)
    assert.equal(accepted.atomicBatch.id, batchId)
    assert.equal(hasUnacknowledgedWalletAction({ transaction: accepted }), true)
    recordSwapExecution('atomic-swap', { swapData: { id: 'atomic-swap', transactions: [
        { type: 'input', status: 'completed', transaction_hash: finalHash },
    ] } })
    const observed = store.getState().swapTransactions['atomic-swap']
    assert.equal(observed.hash, finalHash)
    assert.equal(observed.atomicBatch, undefined)
    assert.equal(observed.providerSubmissionAccepted, undefined)
    assert.equal(hasUnacknowledgedWalletAction({ transaction: observed }), true)
    assert.deepEqual(ctx.catchups, [])
})
