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

test('independent tabs prevent duplicate wallet requests for the same swap', async () => {
    const first = createTab(), second = createTab()
    let prompts = 0, accept
    const pending = first.submit(() => { prompts++; return new Promise(resolve => { accept = resolve }) })
    await flush()
    await assert.rejects(second.submit(() => { prompts++; return { id: 'duplicate' } }), /original wallet request/)
    assert.equal(prompts, 1)
    accept({ id: 'first-id' }); await pending
    assert.equal(createTab().getAtomicBatch('atomic-swap').id, 'first-id')
})

test('an unresolved request never blocks an unrelated swap', async () => {
    const first = createTab(), second = createTab()
    await assert.rejects(first.submit(async () => { throw new Error('Lost response') }))
    await second.submit(async () => ({ id: 'second-id' }), 'other-swap')
    assert.equal(savedBatches()['atomic-swap'].id, undefined)
    assert.equal(savedBatches()['other-swap'].id, 'second-id')
})

test('journal stores only request identifiers and strips legacy outcomes during recovery', async () => {
    const first = createTab()
    await first.submit(async () => ({ id: 'first-id' }))
    const record = savedBatches()['atomic-swap']
    assert.deepEqual(Object.keys(record).sort(), ['swapId', 'attempt', 'account', 'network', 'wallet', 'createdAt', 'id'].sort())
    storage.values.set('atomicBatches', JSON.stringify({ state: { batches: { 'atomic-swap': {
        ...record, state: 'failed', transactionHash: 'old-hash', catchupComplete: true, validBefore: 100,
    } } }, version: 0 }))
    const reloaded = createTab()
    assert.deepEqual(reloaded.getAtomicBatch('atomic-swap'), record)
})

test('a delayed ID cannot replace a newer request or resurrect an acknowledged request', async () => {
    const first = createTab(), second = createTab()
    await first.submit(async () => ({ id: 'original' }))
    const original = first.getAtomicBatch('atomic-swap')
    await second.useAtomicBatchStore.getState().remove(original.swapId, original.attempt)
    await first.useAtomicBatchStore.getState().update(original.swapId, original.attempt, { id: 'late' })
    assert.equal(first.getAtomicBatch('atomic-swap'), undefined)
    await second.submit(async () => ({ id: 'retry' }))
    await first.useAtomicBatchStore.getState().update(original.swapId, original.attempt, { id: 'late' })
    assert.equal(savedBatches()['atomic-swap'].id, 'retry')
})

for (const failure of ['quota', 'verification', 'read']) test(`${failure} failure before submission does not open the wallet`, async () => {
    const tab = createTab()
    storage.failWrites = failure === 'quota'
    storage.discardWrites = failure === 'verification'
    storage.failReadsAfterWrite = failure === 'read'
    await assert.rejects(tab.submit(() => assert.fail('storage must precede wallet prompt')), /Storage|persist/)
    assert.equal(tab.getAtomicBatch('atomic-swap'), undefined)
})

for (const failure of ['read', 'write']) test(`accepted ID survives storage ${failure} outage and is flushed after recovery`, async () => {
    const tab = createTab()
    await assert.rejects(tab.submit(async () => {
        storage.failReadsAfterWrite = failure === 'read'; storage.failWrites = failure === 'write'
        return { id: 'accepted' }
    }), /Storage/)
    const batch = tab.getAtomicBatch('atomic-swap')
    assert.equal(batch.id, 'accepted')
    storage.failReadsAfterWrite = false; storage.failWrites = false
    await tab.reloadAtomicBatchStorage()
    assert.equal(createTab().getAtomicBatch('atomic-swap').id, 'accepted')
    await assert.rejects(tab.submit(() => assert.fail('same swap cannot repeat')), /original wallet request/)
})

test('live pending receipt polls do not write or notify storage', async t => {
    const tab = createTab()
    await tab.submit(async () => ({ id: 'pending-id' }))
    const batch = tab.getAtomicBatch('atomic-swap')
    const { trackAtomicBatch } = loadSource('../src/lib/atomicBatchTracking.ts', {
        '@/helpers/atomicBatch': loadSource('../src/helpers/atomicBatch.ts'),
    })
    t.mock.timers.enable({ apis: ['setTimeout'] })
    let polls = 0, notifications = 0
    const unsubscribe = tab.useAtomicBatchStore.subscribe(() => { notifications++ })
    const writesBefore = storage.writes
    const stop = trackAtomicBatch(batch, {
        getRecord: id => tab.useAtomicBatchStore.getState().batches[id],
        onOutcome: () => {},
        getStatus: async () => { polls++; return { id: batch.id, chainId: 42161, atomic: true, statusCode: 100, receipts: [] } },
        onConfirmed: () => assert.fail('pending receipt cannot confirm'),
    })
    try {
        await flush()
        for (let i = 0; i < 5; i++) { t.mock.timers.tick(2000); await flush() }
        assert.equal(polls, 6); assert.equal(storage.writes, writesBefore); assert.equal(notifications, 0)
    } finally { stop(); unsubscribe() }
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

test('storage events synchronize mounted tabs without writing the snapshot back', async () => {
    const first = createTab(), second = createTab()
    const unsubscribe = first.subscribeAtomicBatchStorage()
    try {
        await flush()
        await second.submit(async () => ({ id: 'other-tab-id' }))
        const writesBefore = storage.writes
        const event = new Event('storage'); event.key = 'atomicBatches'
        browser.dispatchEvent(event); await flush()
        assert.equal(first.getAtomicBatch('atomic-swap').id, 'other-tab-id')
        assert.equal(storage.writes, writesBefore)
    } finally { unsubscribe() }
})

test('browsers without Web Locks cannot submit an existing atomic workflow', async () => {
    const tab = createTab(), locks = navigator.locks
    try {
        navigator.locks = undefined
        await assert.rejects(tab.submit(() => assert.fail('uncoordinated wallet request')), /safely coordinate/)
        assert.equal(tab.getAtomicBatch('atomic-swap'), undefined)
        assert.equal(storage.writes, 0)
    } finally { navigator.locks = locks }
})
