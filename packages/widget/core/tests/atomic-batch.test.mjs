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
    if (specifier.endsWith('/lib/apiClients/layerSwapApiClient')) return { url: apiUrl, shortCircuit: true }
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) return nextResolve(`${specifier}.js`, context)
    return nextResolve(specifier, context)
} })
const { validateAtomicBatch, resolveAtomicBatchOutcome, isAtomicBatchEligible } = await import('../dist/esm/helpers/atomicBatch.js')
const { getActionableDepositAction, getDepositActionLabel, getDepositActionDescription } = await import('../dist/esm/helpers/depositActions.js')
const { executeAtomicBatch } = await import('../dist/esm/lib/atomicBatchExecution.js')
const { useSwapTransactionStore: store } = await import('../dist/esm/stores/swapTransactionStore.js')
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/atomic-batch.json', import.meta.url)))
const hash = `0x${'a'.repeat(64)}`, finalHash = `0x${'b'.repeat(64)}`
const batchId = 'wallet-batch-id-that-is-not-a-hash'
const receipt = (transactionHash = hash, status = 'success') => ({ transactionHash, status })
const status = (statusCode = 200, receipts = [receipt()]) => ({ id: batchId, chainId: 42161, atomic: true, statusCode, receipts })
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
    submit: async () => ({ id: batchId }), getStatus: async () => status(), ...provider,
})

for (const [name, action] of Object.entries(fixtures.actions)) test(`preserves backend call order and saves only the final receipt: ${name}`, async () => {
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
        assert.deepEqual(store.getState().swapTransactions, {}, 'opening the wallet creates no recovery record')
        return { id: batchId }
    }, getStatus: async (request, id) => {
        assert.equal(id, batchId)
        assert.equal(request.account, fixtures.account)
        return status(200, [receipt(), receipt(finalHash)])
    } })
    assert.equal(getActionableDepositAction([action]), action)
    assert.equal(getDepositActionLabel(action), expectedLabel)
    assert.equal(getDepositActionDescription(action), needsApproval
        ? 'Approve the token and swap in one atomic batch' : 'Submit the swap transaction')
    assert.deepEqual(store.getState().swapTransactions['atomic-swap'], {
        kind: 'atomic-batch', hash: finalHash, timestamp: store.getState().swapTransactions['atomic-swap'].timestamp,
    })
    assert.equal(store.getState().stepTransactions['atomic-swap'].publish.explorerUrl, `https://arbiscan.io/tx/${finalHash}`)
    assert.equal(ctx.successes, 1)
    assert.deepEqual(ctx.catchups, [['atomic-swap', finalHash]])
    assert.ok(!JSON.stringify([...storage]).includes(batchId))
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

test('a saved atomic kind allows submission without browser coordination', async () => {
    store.getState().setSwapTransactionKind('atomic-swap', 'atomic-batch')
    await submit()
    assert.equal(store.getState().swapTransactions['atomic-swap'].hash, hash)
})

test('pending receipts keep the submission active without persisting the wallet ID', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const ctx = context()
    let polls = 0
    const pending = submit(ctx, { getStatus: async () => ++polls === 1 ? status(100, []) : status(200, [receipt(finalHash)]) })
    await flush()
    assert.deepEqual(store.getState().swapTransactions, {})
    assert.equal(ctx.successes, 0)
    assert.deepEqual(ctx.catchups, [])
    t.mock.timers.tick(2000)
    await pending
    assert.equal(polls, 2)
    assert.equal(store.getState().swapTransactions['atomic-swap'].hash, finalHash)
    assert.equal(ctx.successes, 1)
})

test('a transient status outage retries the same wallet ID within the active submission', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const ctx = context()
    let polls = 0, submissions = 0
    const pending = submit(ctx, {
        submit: async () => { submissions++; return { id: batchId } },
        getStatus: async (_, id) => {
            assert.equal(id, batchId)
            if (++polls === 1) throw new Error('Status unavailable')
            return status()
        },
    })
    await flush()
    assert.deepEqual(store.getState().swapTransactions, {})
    t.mock.timers.tick(2000)
    await pending
    assert.equal(submissions, 1)
    assert.equal(polls, 2)
    assert.equal(store.getState().swapTransactions['atomic-swap'].hash, hash)
})

for (const [name, error] of [
    ['rejection', { code: 4001 }], ['proven non-submission', { atomicSubmission: 'not_submitted' }],
    ['lost response', new Error('Connection lost')],
]) test(`${name} leaves no pending atomic record`, async () => {
    store.getState().setSwapTransactionKind('atomic-swap', 'atomic-batch')
    const ctx = context()
    await assert.rejects(submit(ctx, { submit: async () => { throw error } }))
    assert.deepEqual(store.getState().swapTransactions['atomic-swap'], { kind: 'atomic-batch' })
    assert.deepEqual(store.getState().pendingSubmissions, {})
    assert.equal(ctx.successes, 0)
    assert.deepEqual(ctx.catchups, [])
})

test('a malformed wallet response cannot be saved as a transaction', async () => {
    const ctx = context()
    await assert.rejects(submit(ctx, { submit: async () => ({}) }), /no batch ID/)
    assert.deepEqual(store.getState().swapTransactions, {})
    assert.equal(ctx.successes, 0)
})

for (const code of [400, 500]) test(`unsuccessful wallet status ${code} cannot create a successful receipt`, async () => {
    const ctx = context()
    await assert.rejects(submit(ctx, { getStatus: async () => status(code, code === 500 ? [receipt(hash, 'reverted')] : []) }), /not executed successfully/)
    assert.deepEqual(store.getState().swapTransactions, {})
    assert.equal(ctx.successes, 0)
    assert.deepEqual(ctx.catchups, [])
})

test('an accepted submission records its receipt after the screen closes', async () => {
    const ctx = context(), controller = new AbortController()
    ctx.signal = controller.signal
    let accept
    const pending = submit(ctx, { submit: () => new Promise(resolve => { accept = resolve }), getStatus: async request => {
        assert.equal(request.account, fixtures.account)
        assert.equal(request.wallet.id, 'Original')
        assert.equal(request.signal, undefined)
        return status()
    } })
    await flush()
    controller.abort()
    ctx.selectedWallet = { address: 'another-account' }
    accept({ id: batchId })
    await pending
    assert.equal(store.getState().swapTransactions['atomic-swap'].hash, hash)
})

test('a hung receipt request times out and its late response cannot save a transaction', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    let resolveStatus
    const ctx = context()
    const pending = submit(ctx, { getStatus: () => new Promise(resolve => { resolveStatus = resolve }) })
    const rejected = assert.rejects(pending, /Timed out/)
    await flush()
    t.mock.timers.tick(120_000)
    await rejected
    resolveStatus(status())
    await flush()
    assert.deepEqual(store.getState().swapTransactions, {})
    assert.deepEqual(ctx.catchups, [])
})

test('a catchup failure does not repeat submission or discard the saved receipt', async () => {
    const ctx = context()
    let polls = 0, catchups = 0
    ctx.layerswapApiClient.SwapCatchup = async () => { catchups++; throw new Error('Speedup unavailable') }
    await submit(ctx, { getStatus: async () => { polls++; return status() } })
    assert.equal(polls, 1)
    assert.equal(catchups, 1)
    assert.equal(ctx.successes, 1)
    assert.equal(store.getState().swapTransactions['atomic-swap'].hash, hash)
    assert.deepEqual(ctx.events.map(event => event.step), ['transaction_submitted'])
})
