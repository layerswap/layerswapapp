import assert from 'node:assert/strict'
import test, { after, afterEach } from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { createLockManager } from './helpers/atomic-batch-locks.mjs'

const require = createRequire(import.meta.url)
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/atomic-batch.json', import.meta.url)))
const previous = Object.getOwnPropertyDescriptors(globalThis)
const storage = {
    values: new Map(), writes: 0, failWrites: false, discardWrites: false, failReadsAfterWrite: false,
    getItem(key) {
        if (this.failReadsAfterWrite && this.writes) throw new Error('Storage reads unavailable')
        return this.values.get(key) ?? null
    },
    setItem(key, value) {
        this.writes++
        if (this.failWrites) throw new DOMException('Storage is full', 'QuotaExceededError')
        if (!this.discardWrites) this.values.set(key, value)
    },
    removeItem(key) { this.values.delete(key) },
}
const browser = new EventTarget()
for (const [key, value] of Object.entries({ localStorage: storage, navigator: { locks: createLockManager() }, window: browser })) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
afterEach(() => {
    storage.values.clear(); storage.writes = 0
    storage.failWrites = false; storage.discardWrites = false; storage.failReadsAfterWrite = false
})
after(() => {
    for (const key of ['localStorage', 'navigator', 'window']) {
        if (previous[key]) Object.defineProperty(globalThis, key, previous[key]); else delete globalThis[key]
    }
})

function loadSource(path, imports = {}) {
    const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', outputText)(name => name in imports ? imports[name] : require(name), module, module.exports)
    return module.exports
}

// Each tab gets independent module/Zustand state but shares the origin's storage
// and Web Locks queue. No submission or persistence guard is stubbed.
function createTab() {
    const store = loadSource('../src/stores/atomicBatchStore.ts')
    const execution = loadSource('../src/lib/atomicBatchExecution.ts', {
        '@/helpers/atomicBatch': loadSource('../src/helpers/atomicBatch.ts'),
        '@/helpers/depositActions': loadSource('../src/helpers/depositActions.ts'),
        '@/stores/atomicBatchStore': store,
        '@/components/Pages/Swap/Withdraw/Wallet/Common/isUserRejection': { isUserRejection: error => error?.code === 4001 },
        './swapLifecycle': { lifecycleContextFromSwap: () => ({}), lifecycleErrorDetails: () => ({}) },
    })
    const context = (swapId = 'atomic-swap') => ({
        swapData: { id: swapId, source_address: fixtures.account }, swapBasicData: fixtures.swap,
        selectedWallet: { id: 'Original', providerName: 'evm', address: fixtures.account, addresses: [fixtures.account] },
        sourceAddress: fixtures.account, depositActions: [fixtures.actions.zero_allowance],
        setActionStateText() {}, onLifecycle() {},
    })
    return { ...store, submit: (implementation, swapId, signal) => {
        const ctx = context(swapId)
        ctx.signal = signal
        return execution.executeAtomicBatch(ctx, ctx.depositActions[0], { submit: implementation })
    } }
}

const flush = async () => { for (let i = 0; i < 80; i++) await Promise.resolve() }
const savedBatches = () => JSON.parse(storage.values.get('atomicBatches')).state.batches

test('subscribers observe submission state only after it has been saved', async () => {
    const tab = createTab(), states = []
    const unsubscribe = tab.useAtomicBatchStore.subscribe(({ batches }) => {
        assert.deepEqual(JSON.parse(JSON.stringify(batches)), savedBatches())
        states.push(batches['atomic-swap'].state)
    })
    try {
        await tab.submit(async () => ({ id: 'accepted' }))
        assert.deepEqual(states, ['submitting', 'pending'])
    } finally { unsubscribe() }
})

for (const differentSwap of [false, true]) test(`independent tabs open only one wallet prompt for ${differentSwap ? 'different swaps' : 'the same swap'}`, async () => {
    const first = createTab(), second = createTab()
    let prompts = 0, accept
    const pending = first.submit(() => { prompts++; return new Promise(resolve => { accept = resolve }) })
    const refused = assert.rejects(second.submit(async () => { prompts++; return { id: 'second-id' } }, differentSwap ? 'other-swap' : undefined), /earlier batch/)
    await flush()
    assert.equal(prompts, 1)
    assert.equal(first.getOutstandingBatch().state, 'submitting')
    await refused
    accept({ id: 'first-id' }); await pending
    const reloaded = createTab()
    assert.equal(reloaded.getOutstandingBatch().id, 'first-id')
    assert.deepEqual(Object.keys(savedBatches()), ['atomic-swap'])
})

test('a late catchup from a stale tab preserves another tab\'s newer recovery record', async () => {
    const first = createTab(), second = createTab()
    await first.submit(async () => ({ id: 'first-id' }))
    const original = first.getOutstandingBatch()
    await first.useAtomicBatchStore.getState().update(original.swapId, original.attempt, { state: 'confirmed', transactionHash: `0x${'a'.repeat(64)}` })
    await second.submit(async () => ({ id: 'second-id' }), 'new-swap')
    assert.equal(first.useAtomicBatchStore.getState().batches['new-swap'], undefined, 'first tab is stale')
    await first.useAtomicBatchStore.getState().update(original.swapId, original.attempt, { catchupComplete: true })
    assert.equal(savedBatches()['new-swap'].id, 'second-id')
    assert.equal(savedBatches()['atomic-swap'].id, 'first-id')
    assert.equal(savedBatches()['atomic-swap'].catchupComplete, true)
})

test('an old attempt cannot replace a retry submitted from another tab', async () => {
    const first = createTab(), second = createTab()
    await first.submit(async () => ({ id: 'failed-id' }))
    const original = first.getOutstandingBatch()
    await second.useAtomicBatchStore.getState().update(original.swapId, original.attempt, { state: 'failed' })
    await second.submit(async () => ({ id: 'retry-id' }))
    await first.useAtomicBatchStore.getState().update(original.swapId, original.attempt, { state: 'pending', id: 'failed-id' })
    assert.equal(savedBatches()['atomic-swap'].id, 'retry-id')
    assert.notEqual(savedBatches()['atomic-swap'].attempt, original.attempt)
})

for (const failure of ['quota', 'verification', 'read']) test(`${failure} failure before submission never publishes a false lock and allows explicit retry`, async () => {
    const tab = createTab()
    let submissions = 0, notifications = 0
    const unsubscribe = tab.useAtomicBatchStore.subscribe(() => { notifications++ })
    storage.failWrites = failure === 'quota'
    storage.discardWrites = failure === 'verification'
    storage.failReadsAfterWrite = failure === 'read'
    try {
        await assert.rejects(tab.submit(async () => { submissions++; return { id: 'accepted' } }), /Storage|persist/)
        assert.equal(submissions, 0)
        assert.equal(tab.getOutstandingBatch(), undefined)
        assert.equal(notifications, 0)
    } finally { unsubscribe() }
    storage.failWrites = false; storage.discardWrites = false; storage.failReadsAfterWrite = false
    await tab.submit(async () => { submissions++; return { id: 'accepted' } })
    assert.equal(submissions, 1)
    assert.equal(tab.getOutstandingBatch().id, 'accepted')
})

for (const failure of ['read', 'write']) test(`storage ${failure} failure after an accepted wallet request retains its ID and blocks another send`, async () => {
    const tab = createTab()
    await assert.rejects(tab.submit(async () => {
        storage.failReadsAfterWrite = failure === 'read'
        storage.failWrites = failure === 'write'
        return { id: 'accepted-before-storage-outage' }
    }), /Storage/)
    const batch = tab.getOutstandingBatch()
    assert.equal(batch.state, 'uncertain')
    assert.equal(batch.id, 'accepted-before-storage-outage')
    storage.failReadsAfterWrite = false; storage.failWrites = false
    await assert.rejects(tab.submit(() => assert.fail('accepted request cannot be retried')), /earlier batch/)
    await tab.useAtomicBatchStore.getState().update(batch.swapId, batch.attempt, { state: 'uncertain' })
    assert.equal(savedBatches()[batch.swapId].id, batch.id)
    assert.equal(savedBatches()[batch.swapId].state, 'uncertain', 'unchanged status still flushes recovered ID evidence')
    assert.equal(createTab().getOutstandingBatch().id, batch.id)
})

for (const terminal of ['rejected', 'not_submitted', 'failed']) {
    for (const failure of ['read', 'write']) test(`${terminal} survives a storage ${failure} outage and permits explicit retry after recovery`, async () => {
        const tab = createTab()
        const failStorage = () => {
            storage.failReadsAfterWrite = failure === 'read'
            storage.failWrites = failure === 'write'
        }
        if (terminal === 'failed') {
            await tab.submit(async () => ({ id: 'failed-id' }))
            const batch = tab.getOutstandingBatch()
            failStorage()
            await assert.rejects(tab.useAtomicBatchStore.getState().update(batch.swapId, batch.attempt, { state: terminal }), /Storage/)
        } else {
            await assert.rejects(tab.submit(async () => {
                failStorage()
                throw Object.assign(new Error('Wallet refused submission'), terminal === 'rejected'
                    ? { code: 4001 } : { atomicSubmission: 'not_submitted' })
            }), /Storage/)
        }
        const batch = tab.useAtomicBatchStore.getState().batches['atomic-swap']
        assert.equal(batch.state, terminal)
        assert.equal(savedBatches()[batch.swapId].state, terminal === 'failed' ? 'pending' : 'submitting')
        if (terminal !== 'failed') assert.equal(savedBatches()[batch.swapId].id, undefined)

        storage.failReadsAfterWrite = false; storage.failWrites = false
        const writesBefore = storage.writes
        await tab.reloadAtomicBatchStorage()
        assert.equal(storage.writes, writesBefore, 'reload must not persist recovery evidence implicitly')
        assert.equal(tab.useAtomicBatchStore.getState().batches[batch.swapId].state, terminal)
        assert.equal(tab.getOutstandingBatch(), undefined)
        await tab.useAtomicBatchStore.getState().update(batch.swapId, batch.attempt, { state: terminal })
        assert.equal(createTab().useAtomicBatchStore.getState().batches[batch.swapId].state, terminal)

        let submissions = 0
        await tab.submit(async () => { submissions++; return { id: 'explicit-retry' } })
        assert.equal(submissions, 1)
        assert.equal(tab.getOutstandingBatch().id, 'explicit-retry')
        assert.notEqual(tab.getOutstandingBatch().attempt, batch.attempt)
    })
}

for (const terminal of ['confirmed', 'reconciled']) test(`another tab's durable ${terminal} proof overrides a rejection retained during an outage`, async () => {
    const first = createTab(), second = createTab()
    await assert.rejects(first.submit(async () => {
        storage.failWrites = true
        throw Object.assign(new Error('Wallet refused submission'), { code: 4001 })
    }), /Storage/)
    const batch = first.useAtomicBatchStore.getState().batches['atomic-swap'], hash = `0x${'a'.repeat(64)}`
    storage.failWrites = false
    await second.useAtomicBatchStore.getState().update(batch.swapId, batch.attempt, { state: terminal, transactionHash: hash })
    await first.reloadAtomicBatchStorage()
    assert.equal(first.useAtomicBatchStore.getState().batches[batch.swapId].state, terminal)
    assert.equal(first.useAtomicBatchStore.getState().batches[batch.swapId].transactionHash, hash)
    await assert.rejects(first.submit(() => assert.fail('successful proof must prevent another submission')), /already submitted/)
})

test('durable reconciliation takes precedence over a confirmed receipt retained during an outage', async () => {
    const first = createTab(), second = createTab()
    await first.submit(async () => ({ id: 'accepted' }))
    const batch = first.getOutstandingBatch(), hash = `0x${'a'.repeat(64)}`
    storage.failWrites = true
    await assert.rejects(first.useAtomicBatchStore.getState().update(batch.swapId, batch.attempt, {
        state: 'confirmed', transactionHash: hash,
    }), /Storage/)
    storage.failWrites = false
    await second.useAtomicBatchStore.getState().update(batch.swapId, batch.attempt, { state: 'reconciled' })
    await first.reloadAtomicBatchStorage()
    const reconciled = first.useAtomicBatchStore.getState().batches[batch.swapId]
    assert.equal(reconciled.state, 'reconciled')
    assert.equal(reconciled.transactionHash, hash)
    await assert.rejects(first.submit(() => assert.fail('reconciled swaps cannot be retried')), /already submitted/)
})

test('a retained rejection cannot release a newer attempt submitted by another tab', async () => {
    const first = createTab(), second = createTab()
    await assert.rejects(first.submit(async () => {
        storage.failWrites = true
        throw Object.assign(new Error('Wallet refused submission'), { code: 4001 })
    }), /Storage/)
    const batch = first.useAtomicBatchStore.getState().batches['atomic-swap']
    storage.failWrites = false
    await second.useAtomicBatchStore.getState().update(batch.swapId, batch.attempt, { state: 'rejected' })
    await second.submit(async () => ({ id: 'other-tab-retry' }))
    await first.reloadAtomicBatchStorage()
    assert.equal(first.getOutstandingBatch().id, 'other-tab-retry')
    assert.notEqual(first.getOutstandingBatch().attempt, batch.attempt)
    await assert.rejects(first.submit(() => assert.fail('a newer pending attempt cannot be retried')), /earlier batch/)
})

test('receipt evidence survives a failed write and another tab\'s later status update', async () => {
    const first = createTab(), second = createTab()
    await first.submit(async () => ({ id: 'accepted' }))
    const batch = first.getOutstandingBatch(), hash = `0x${'a'.repeat(64)}`
    storage.failWrites = true
    await assert.rejects(first.useAtomicBatchStore.getState().update(batch.swapId, batch.attempt, {
        state: 'confirmed', transactionHash: hash,
    }), /Storage is full/)
    assert.equal(first.useAtomicBatchStore.getState().batches[batch.swapId].transactionHash, hash)
    assert.equal(savedBatches()[batch.swapId].state, 'pending')

    storage.failWrites = false
    await second.useAtomicBatchStore.getState().update(batch.swapId, batch.attempt, { state: 'uncertain' })
    const writesBefore = storage.writes
    await first.reloadAtomicBatchStorage()
    assert.equal(storage.writes, writesBefore, 'reload must not write evidence back implicitly')
    assert.equal(first.useAtomicBatchStore.getState().batches[batch.swapId].state, 'confirmed')
    assert.equal(first.useAtomicBatchStore.getState().batches[batch.swapId].transactionHash, hash)
    await first.useAtomicBatchStore.getState().update(batch.swapId, batch.attempt, { catchupComplete: true })
    const reloaded = createTab().useAtomicBatchStore.getState().batches[batch.swapId]
    assert.equal(reloaded.state, 'confirmed')
    assert.equal(reloaded.transactionHash, hash)
    assert.equal(reloaded.catchupComplete, true)
})

test('unreadable recovery records prevent submission without overwriting storage', async () => {
    for (const value of ['{', JSON.stringify({ state: {} }), JSON.stringify({ state: { batches: [] } })]) {
        storage.values.set('atomicBatches', value)
        const tab = createTab()
        await assert.rejects(tab.submit(() => assert.fail('unreadable records cannot authorize submission')))
        assert.equal(storage.writes, 0)
        assert.equal(storage.values.get('atomicBatches'), value)
    }
})

test('a failed recovery write preserves the previous failed attempt', async () => {
    const tab = createTab()
    await tab.submit(async () => ({ id: 'failed-id' }))
    const batch = tab.getOutstandingBatch()
    await tab.useAtomicBatchStore.getState().update(batch.swapId, batch.attempt, { state: 'failed' })
    const previousAttempt = tab.useAtomicBatchStore.getState().batches[batch.swapId]
    storage.failWrites = true
    await assert.rejects(tab.submit(() => assert.fail('failed persistence cannot open the wallet')), /Storage is full/)
    assert.equal(tab.useAtomicBatchStore.getState().batches[batch.swapId], previousAttempt)
    assert.equal(tab.getOutstandingBatch(), undefined)
})

test('cancellation while awaiting the storage mutex never opens the wallet or leaves a false lock', async () => {
    const tab = createTab(), controller = new AbortController()
    let release
    const held = navigator.locks.request('layerswap-atomic-batch-storage', () => new Promise(resolve => { release = resolve }))
    await flush()
    const refused = assert.rejects(tab.submit(() => assert.fail('cancelled screen cannot open the wallet'), undefined, controller.signal), { name: 'AbortError' })
    controller.abort(); release(); await held; await refused
    assert.equal(tab.getOutstandingBatch(), undefined)
    assert.equal(tab.useAtomicBatchStore.getState().batches['atomic-swap'].state, 'not_submitted')
    await tab.submit(async () => ({ id: 'explicit-retry' }))
    assert.equal(tab.getOutstandingBatch().id, 'explicit-retry')
})

test('unchanged pending polls write nothing and broadcast no store notifications', async t => {
    const tab = createTab()
    await tab.submit(async () => ({ id: 'pending-id' }))
    const batch = tab.getOutstandingBatch()
    const { trackAtomicBatch } = loadSource('../src/lib/atomicBatchTracking.ts', {
        '@/helpers/atomicBatch': loadSource('../src/helpers/atomicBatch.ts'),
    })
    t.mock.timers.enable({ apis: ['setTimeout'] })
    let polls = 0, notifications = 0
    const unsubscribe = tab.useAtomicBatchStore.subscribe(() => { notifications++ })
    const writesBefore = storage.writes
    const stop = trackAtomicBatch(batch, {
        getRecord: id => tab.useAtomicBatchStore.getState().batches[id],
        update: (record, update) => tab.useAtomicBatchStore.getState().update(record.swapId, record.attempt, update),
        getStatus: async () => { polls++; return { id: batch.id, chainId: 42161, atomic: true, statusCode: 100, receipts: [] } },
        onConfirmed: () => assert.fail('pending batch cannot confirm'),
    })
    try {
        await flush()
        for (let i = 0; i < 5; i++) { t.mock.timers.tick(2000); await flush() }
        assert.equal(polls, 6)
        assert.equal(storage.writes, writesBefore)
        assert.equal(notifications, 0)
    } finally { stop(); unsubscribe() }
})

test('storage events synchronize mounted tabs without writing the snapshot back', async () => {
    const first = createTab(), second = createTab()
    const unsubscribe = first.subscribeAtomicBatchStorage()
    try {
        await flush()
        await second.submit(async () => ({ id: 'other-tab-id' }))
        const writesBefore = storage.writes
        const event = new Event('storage'); event.key = 'atomicBatches'
        browser.dispatchEvent(event); await flush()
        assert.equal(first.getOutstandingBatch().id, 'other-tab-id')
        assert.equal(storage.writes, writesBefore)
    } finally { unsubscribe() }
})

test('browsers without Web Locks cannot submit an existing atomic workflow', async () => {
    const tab = createTab(), locks = navigator.locks
    try {
        navigator.locks = undefined
        await assert.rejects(tab.submit(() => assert.fail('uncoordinated wallet request')), /safely coordinate/)
        assert.equal(tab.getOutstandingBatch(), undefined)
        assert.equal(storage.writes, 0)
    } finally { navigator.locks = locks }
})
