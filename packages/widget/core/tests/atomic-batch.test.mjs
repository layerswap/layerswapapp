import assert from 'node:assert/strict'
import test, { after, afterEach } from 'node:test'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'
import { createLockManager } from './helpers/atomic-batch-locks.mjs'

const dom = new JSDOM('<div id="root"></div>', { url: 'https://widget.example' })
const previous = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document,
    localStorage: dom.window.localStorage, navigator: { userAgent: dom.window.navigator.userAgent, locks: createLockManager() }, IS_REACT_ACT_ENVIRONMENT: true })) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
const apiUrl = `data:text/javascript,${encodeURIComponent(`
    export const harness = { catchups: [], statuses: [], provider: undefined }
    export const BackendTransactionStatus = { Pending: 'pending', Failed: 'failed', Completed: 'completed' }
    export const TransactionType = { Input: 'input' }
    export default class Client { async SwapCatchup(...args) { harness.catchups.push(args); if (harness.catchupError) throw harness.catchupError } }
`)}`
const resolverUrl = `data:text/javascript,${encodeURIComponent(`
    import { harness } from ${JSON.stringify(apiUrl)}
    export const resolverService = { getTransferResolver: () => ({ getAtomicBatchProvider: () => harness.provider }) }
`)}`
const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.endsWith('/lib/apiClients/layerSwapApiClient')) return { url: apiUrl, shortCircuit: true }
        if (specifier.endsWith('/lib/resolvers/resolverService')) return { url: resolverUrl, shortCircuit: true }
        if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) return nextResolve(`${specifier}.js`, context)
        return nextResolve(specifier, context)
    },
})
const { harness } = await import(apiUrl)
const { createRoot } = await import('react-dom/client')
const { validateAtomicBatch, resolveAtomicBatchOutcome, isAtomicBatchEligible } = await import('../dist/esm/helpers/atomicBatch.js')
const { getActionableDepositAction, getDepositActionLabel, getDepositActionDescription } = await import('../dist/esm/helpers/depositActions.js')
const { executeAtomicBatch } = await import('../dist/esm/lib/atomicBatchExecution.js')
const { trackAtomicBatch } = await import('../dist/esm/lib/atomicBatchTracking.js')
const { useAtomicBatchTracking } = await import('../dist/esm/hooks/useAtomicBatchTracking.js')
const { useAtomicBatchStore, getOutstandingBatch, acquireWalletExecution, reloadAtomicBatchStorage } = await import('../dist/esm/stores/atomicBatchStore.js')
const { useSwapTransactionStore } = await import('../dist/esm/stores/swapTransactionStore.js')
const { useGaslessPreferenceStore } = await import('../dist/esm/stores/gaslessPreferenceStore.js')
const { hasSwapExecutionProgress } = await import('../dist/esm/helpers/swapProgress.js')
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/atomic-batch.json', import.meta.url)))
const hash = `0x${'a'.repeat(64)}`, finalHash = `0x${'b'.repeat(64)}`
const batchId = 'wallet-batch-id-that-is-not-a-hash'
const receipt = (transactionHash = hash, status = 'success') => ({ transactionHash, status })
const status = (statusCode = 200, receipts = [receipt()]) => ({ id: batchId, chainId: 42161, atomic: true, statusCode, receipts })
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve() }
afterEach(() => {
    useAtomicBatchStore.setState({ batches: {} })
    localStorage.removeItem('atomicBatches')
    useSwapTransactionStore.setState({ swapTransactions: {}, stepTransactions: {} })
    useGaslessPreferenceStore.getState().resetGaslessPreference()
    harness.catchups = []; harness.statuses = []; harness.catchupError = undefined
})
after(() => {
    hooks.deregister(); dom.window.close()
    for (const key of ['window', 'document', 'localStorage', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) {
        if (previous[key]) Object.defineProperty(globalThis, key, previous[key]); else delete globalThis[key]
    }
})

function context(action = fixtures.actions.zero_allowance) {
    return { swapData: { id: 'atomic-swap', source_address: fixtures.account }, swapBasicData: fixtures.swap,
        selectedWallet: { id: 'Original', providerName: 'evm', internalId: 'original', address: fixtures.account,
            addresses: [fixtures.account], chainId: 42161, metadata: { connectorId: 'original' } },
        sourceAddress: fixtures.account, depositActions: [action], setActionStateText() {}, onLifecycle() {},
        setSwapTransaction: () => assert.fail('batch submission cannot store an ID as a transaction hash'),
        onSuccess: () => assert.fail('success requires validated receipts') }
}
const submit = async (ctx = context(), implementation = async () => ({ id: batchId })) => executeAtomicBatch(ctx, ctx.depositActions[0], { submit: implementation })

for (const [name, action] of Object.entries(fixtures.actions)) test(`preserves backend call order: ${name}`, async () => {
    const ctx = context(action)
    const needsApproval = ['zero_allowance', 'allowance_reset'].includes(name)
    const expectedLabel = needsApproval ? 'Approve and swap' : 'Confirm swap'
    const descriptions = []
    ctx.setActionStateText = text => descriptions.push(text)
    await submit(ctx, async request => {
        assert.deepEqual(descriptions, [`${expectedLabel} in your wallet`])
        assert.deepEqual(request.calls.map(call => call.to), action.calls.map(call => call.to))
        assert.deepEqual(request.calls.map(call => call.data), action.calls.map(call => call.data))
        assert.deepEqual(request.calls.map(call => call.value), action.calls.map(call => BigInt(call.value)))
        assert.ok(getOutstandingBatch(), 'persisted before submission')
        assert.equal(JSON.parse(localStorage.getItem('atomicBatches')).state.batches['atomic-swap'].state, 'submitting')
        return { id: batchId }
    })
    assert.equal(getOutstandingBatch().id, batchId)
    assert.equal(getActionableDepositAction([action]), action)
    assert.equal(getDepositActionLabel(action), expectedLabel)
    assert.equal(getDepositActionDescription(action), needsApproval
        ? 'Approve the token and swap in one atomic batch' : 'Submit the swap transaction')
    assert.deepEqual(useSwapTransactionStore.getState().swapTransactions, {})
})

test('validates sender, chain, expiry, address, calldata and integer values before submission', () => {
    for (const change of [
        { from_address: `0x${'4'.repeat(40)}` }, { network: { ...fixtures.network, chain_id: '1' } },
        { valid_before: 1 }, { type: 'transfer' }, { status: 'waiting' }, { calls: [] },
        { valid_before: undefined, expires_at: undefined }, { expires_at: 'invalid' },
        { valid_before: 2000000001 },
        ...['-1', '1.1', '1e18', '0x', 9007199254740993, '01', `0x${(2n ** 256n).toString(16)}`].map(value => ({ calls: [{ ...fixtures.actions.sufficient_allowance.calls[0], value }] })),
        { calls: [{ ...fixtures.actions.sufficient_allowance.calls[0], to: '0x123' }] },
        { calls: [{ ...fixtures.actions.sufficient_allowance.calls[0], data: '0x123' }] },
    ]) assert.throws(() => validateAtomicBatch({ ...fixtures.actions.zero_allowance, ...change }, fixtures.swap, fixtures.account, fixtures.account))
})

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

test('concurrent instances share a lock, and an unresolved batch blocks fresh swaps and mode changes', async () => {
    const release = acquireWalletExecution()
    assert.ok(release); assert.equal(acquireWalletExecution(), undefined)
    await submit()
    release()
    assert.equal(acquireWalletExecution(), undefined)
    assert.equal(hasSwapExecutionProgress({ atomicBatchOutstanding: true }), true)
    useGaslessPreferenceStore.getState().switchToStandardTransfer()
    assert.equal(useGaslessPreferenceStore.getState().gaslessEnabled, true)
    await assert.rejects(submit(context()), /earlier batch/)
})

test('saving the returned ID survives screen closure and account changes', async () => {
    const ctx = context(), controller = new AbortController(); ctx.signal = controller.signal
    let resolve
    const pending = submit(ctx, () => new Promise(done => { resolve = done }))
    await flush()
    controller.abort(); ctx.selectedWallet = { address: 'another-account' }
    resolve({ id: batchId }); await pending
    assert.equal(getOutstandingBatch().wallet.id, 'Original')
    assert.equal(getOutstandingBatch().account, fixtures.account)
    assert.equal(getOutstandingBatch().id, batchId)
})

test('late IDs cannot reverse backend reconciliation or enable another submission of the same swap', async () => {
    const ctx = context()
    let resolve
    const pending = submit(ctx, () => new Promise(done => { resolve = done }))
    await flush()
    const record = getOutstandingBatch()
    await useAtomicBatchStore.getState().update(record.swapId, record.attempt, { state: 'reconciled' })
    resolve({ id: batchId }); await pending
    const saved = useAtomicBatchStore.getState().batches[record.swapId]
    assert.equal(saved.state, 'reconciled')
    assert.equal(saved.id, batchId)
    await assert.rejects(submit(ctx), /already submitted/)
})

test('complete atomic failure permits explicit retry even when action polling still says pending', async () => {
    await submit()
    const record = getOutstandingBatch()
    await useAtomicBatchStore.getState().update(record.swapId, record.attempt, { state: 'failed' })
    assert.equal(hasSwapExecutionProgress({ depositActions: [{ type: 'send_calls', step: 'publish', status: 'pending' }], atomicBatchFailed: true }), false)
    await submit()
    assert.notEqual(getOutstandingBatch().attempt, record.attempt)
})

for (const [name, error, expected] of [
    ['rejection', { code: 4001 }, 'rejected'], ['proven non-submission', { atomicSubmission: 'not_submitted' }, 'not_submitted'],
    ['lost response', new Error('Connection lost'), 'uncertain'],
]) test(`${name} has the correct retry boundary`, async () => {
    await assert.rejects(submit(context(), async () => { throw error }))
    assert.equal(useAtomicBatchStore.getState().batches['atomic-swap'].state, expected)
    assert.equal(!!getOutstandingBatch(), expected === 'uncertain')
})

test('malformed send result stays locked and batch record rehydrates on reload', async () => {
    await assert.rejects(submit(context(), async () => ({})))
    const saved = localStorage.getItem('atomicBatches')
    assert.equal(getOutstandingBatch().state, 'uncertain')
    useAtomicBatchStore.setState({ batches: {} })
    localStorage.setItem('atomicBatches', saved)
    await reloadAtomicBatchStorage()
    assert.equal(getOutstandingBatch().state, 'uncertain')
    assert.equal(acquireWalletExecution(), undefined)
})

test('accepts only atomic successful receipts on the source chain and uses the final hash', () => {
    assert.deepEqual(resolveAtomicBatchOutcome(status(200, [receipt(), receipt(finalHash)]), 42161, batchId), { state: 'confirmed', hash: finalHash })
    assert.equal(resolveAtomicBatchOutcome(status(500, [receipt(hash, 'reverted')]), 42161, batchId).state, 'failed')
    assert.equal(resolveAtomicBatchOutcome(status(400, []), 42161, batchId).state, 'not_submitted')
    assert.equal(resolveAtomicBatchOutcome(status(100, []), 42161, batchId).state, 'pending')
    for (const change of [{ chainId: 1 }, { atomic: false }, { receipts: [] }, { receipts: [receipt(batchId)] },
        { id: 'another-batch' }, { statusCode: '200' }, { statusCode: 600 },
        { receipts: [receipt(), receipt(finalHash, 'reverted')] }, { statusCode: 500, receipts: [receipt()] },
        { statusCode: 400, receipts: [receipt()] }, { statusCode: 500, receipts: [] }]) {
        assert.equal(resolveAtomicBatchOutcome({ ...status(), ...change }, 42161, batchId).state, 'uncertain')
    }
})

test('status outages back off to 30 seconds and keep the lock; recovery yields only the final hash', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    await submit()
    let calls = 0, recovered = false, confirmed
    const batch = getOutstandingBatch()
    const stop = trackAtomicBatch(batch, {
        getRecord: id => useAtomicBatchStore.getState().batches[id],
        update: (record, update) => useAtomicBatchStore.getState().update(record.swapId, record.attempt, update),
        getStatus: async record => { assert.equal(record.id, batchId); calls++; if (!recovered) throw new Error('outage'); return status(200, [receipt(), receipt(finalHash)]) },
        onConfirmed: async (_record, hash) => { confirmed = hash },
    })
    await flush()
    for (const delay of [4000, 8000, 16000, 30000, 30000]) {
        const before = calls
        t.mock.timers.tick(delay - 1); await flush(); assert.equal(calls, before)
        t.mock.timers.tick(1); await flush(); assert.equal(calls, before + 1)
        assert.ok(getOutstandingBatch())
    }
    recovered = true; t.mock.timers.tick(30000); await flush()
    assert.equal(confirmed, finalHash); assert.equal(getOutstandingBatch(), undefined)
    stop()
})

test('a hung status request times out without allowing its late receipt to confirm the swap', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    await submit()
    let resolveFirst, calls = 0
    const stop = trackAtomicBatch(getOutstandingBatch(), {
        getRecord: id => useAtomicBatchStore.getState().batches[id],
        update: (record, update) => useAtomicBatchStore.getState().update(record.swapId, record.attempt, update),
        getStatus: async () => ++calls === 1 ? new Promise(resolve => { resolveFirst = resolve }) : status(100, []),
        onConfirmed: () => assert.fail('an expired request cannot confirm execution'),
    })
    await flush()
    t.mock.timers.tick(30000); await flush()
    assert.equal(getOutstandingBatch().state, 'uncertain')
    t.mock.timers.tick(4000); await flush()
    assert.equal(calls, 2)
    resolveFirst(status()); await flush()
    assert.equal(getOutstandingBatch().state, 'pending')
    stop()
})

test('swap-provider tracking resumes after reload, ignores selected account changes and survives withdrawal unmount', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    await submit()
    const saved = localStorage.getItem('atomicBatches')
    useAtomicBatchStore.setState({ batches: {} }); localStorage.setItem('atomicBatches', saved)
    await reloadAtomicBatchStorage()
    let completed = false
    harness.provider = { getStatus: async (ctx, id) => {
        harness.statuses.push({ ctx, id })
        return completed ? status(200, [receipt(), receipt(finalHash)]) : status(100, [])
    } }
    const events = []
    function Provider({ child, account }) {
        useAtomicBatchTracking(undefined, event => events.push(event))
        return child ? createElement('p', null, account) : null
    }
    const root = createRoot(document.getElementById('root'))
    try {
        await act(() => root.render(createElement(Provider, { child: true, account: fixtures.account })))
        await act(async () => { t.mock.timers.tick(0); await flush() })
        await act(() => root.render(createElement(Provider, { child: false, account: 'changed' })))
        completed = true
        await act(async () => { t.mock.timers.tick(2000); await flush() })
        assert.equal(harness.statuses.length, 2)
        assert.equal(harness.statuses[1].ctx.account, fixtures.account)
        assert.equal(harness.statuses[1].ctx.wallet.id, 'Original')
        assert.deepEqual(harness.catchups, [['atomic-swap', finalHash]])
        assert.equal(useSwapTransactionStore.getState().swapTransactions['atomic-swap'].hash, finalHash)
        assert.equal(useSwapTransactionStore.getState().stepTransactions['atomic-swap'].publish.explorerUrl, `https://arbiscan.io/tx/${finalHash}`)
        assert.equal(events[0].transactionHash, finalHash)
        assert.ok(!JSON.stringify(events).includes(batchId))
    } finally { await act(() => root.unmount()) }
})
