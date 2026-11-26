import assert from 'node:assert/strict'
import test from 'node:test'
import { loadWalletCore } from './helpers/adapterInitHarness.mjs'

const chunkError = () => Object.assign(new Error('Loading chunk 2757 failed.'), { name: 'ChunkLoadError' })

// A deduplicated initializer like the adapters' init functions: a failed load
// is cleared before any later handler runs. The test settles each load by hand.
function controlledInit() {
    const loads = []
    let pending = null
    const init = () => {
        if (!pending) {
            let settle
            pending = new Promise((resolve, reject) => {
                settle = { resolve, reject }
            })
            pending.catch(() => {
                pending = null
            })
            loads.push(settle)
        }
        return pending
    }
    return { init, loads }
}

const flush = () => new Promise(resolve => setImmediate(resolve))

test('opening the modal runs the initializer; modal events while closed do not', async () => {
    const { retryInitOnModalOpen, connectModalStore } = loadWalletCore()
    const { init, loads } = controlledInit()
    const stop = retryInitOnModalOpen(init)

    connectModalStore._syncSelectedConnector({ id: 'any' })
    assert.equal(loads.length, 0)

    connectModalStore._syncOpen(true)
    assert.equal(loads.length, 1)
    stop()
})

test('a chunk failure during an open modal is retried once', async () => {
    const { retryInitOnModalOpen, connectModalStore } = loadWalletCore()
    const { init, loads } = controlledInit()
    const stop = retryInitOnModalOpen(init)

    connectModalStore._syncOpen(true)
    loads[0].reject(chunkError())
    await flush()
    assert.equal(loads.length, 2)

    loads[1].reject(chunkError())
    await flush()
    assert.equal(loads.length, 2)
    stop()
})

test('a non-chunk initialization failure is not retried automatically', async () => {
    const { retryInitOnModalOpen, connectModalStore } = loadWalletCore()
    const { init, loads } = controlledInit()
    const stop = retryInitOnModalOpen(init)

    connectModalStore._syncOpen(true)
    loads[0].reject(new Error('wallet discovery failed'))
    await flush()
    assert.equal(loads.length, 1)

    connectModalStore._syncOpen(false)
    connectModalStore._syncOpen(true)
    assert.equal(loads.length, 2, 'reopening the modal is still a user-triggered retry')
    stop()
})

test('cleanup stops a pending chunk failure from retrying', async () => {
    const { retryInitOnModalOpen, connectModalStore } = loadWalletCore()
    const { init, loads } = controlledInit()
    const stop = retryInitOnModalOpen(init)

    connectModalStore._syncOpen(true)
    stop()
    loads[0].reject(chunkError())
    await flush()

    assert.equal(loads.length, 1)
    connectModalStore._syncOpen(false)
    connectModalStore._syncOpen(true)
    assert.equal(loads.length, 1)
})

test('a chunk failure after the modal closed waits for the next modal event', async () => {
    const { retryInitOnModalOpen, connectModalStore } = loadWalletCore()
    const { init, loads } = controlledInit()
    const stop = retryInitOnModalOpen(init)

    connectModalStore._syncOpen(true)
    connectModalStore._syncOpen(false)
    loads[0].reject(chunkError())
    await flush()

    assert.equal(loads.length, 1)
    stop()
})

test('selecting a connector during the automatic retry does not allow a third attempt', async () => {
    const { retryInitOnModalOpen, connectModalStore } = loadWalletCore()
    const { init, loads } = controlledInit()
    const stop = retryInitOnModalOpen(init)

    connectModalStore._syncOpen(true)
    loads[0].reject(chunkError())
    await flush()
    connectModalStore._syncSelectedConnector({ id: 'tronlink' })
    loads[1].reject(chunkError())
    await flush()

    assert.equal(loads.length, 2)
    stop()
})

test('subscribing while the modal is open joins that opening', async () => {
    const { retryInitOnModalOpen, connectModalStore } = loadWalletCore()
    const { init, loads } = controlledInit()

    connectModalStore._syncOpen(true)
    const stop = retryInitOnModalOpen(init)
    assert.equal(loads.length, 1)

    loads[0].reject(chunkError())
    await flush()
    assert.equal(loads.length, 2)
    stop()
})

test('each modal opening allows one automatic retry', async () => {
    const { retryInitOnModalOpen, connectModalStore } = loadWalletCore()
    const { init, loads } = controlledInit()
    const stop = retryInitOnModalOpen(init)

    connectModalStore._syncOpen(true)
    loads[0].reject(chunkError())
    await flush()
    loads[1].reject(chunkError())
    await flush()
    assert.equal(loads.length, 2)

    connectModalStore._syncOpen(false)
    connectModalStore._syncOpen(true)
    assert.equal(loads.length, 3)
    loads[2].reject(chunkError())
    await flush()
    loads[3].reject(chunkError())
    await flush()

    assert.equal(loads.length, 4)
    stop()
})
