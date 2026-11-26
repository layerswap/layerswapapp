import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

function loadSource(path, imports = {}) {
    const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', outputText)(name => imports[name], module, module.exports)
    return module.exports
}

function loadRecovery() {
    const modalStore = loadSource('../src/lib/walletConnect/connectModalStore.ts')
    const recovery = loadSource('../src/lib/chunkLoadRecovery.ts', { './walletConnect/connectModalStore': modalStore })
    return { ...recovery, modal: modalStore.connectModalStore }
}

// A deduplicated initializer like the adapters' init functions; each load is settled by hand.
function controlledInit() {
    const loads = []
    let pending = null
    const init = () => {
        if (!pending) {
            pending = new Promise((resolve, reject) => loads.push({ resolve, reject }))
            pending.catch(() => {
                pending = null
            })
        }
        return pending
    }
    return { init, loads }
}

const chunkError = () => Object.assign(new Error('Loading chunk 2757 failed.'), { name: 'ChunkLoadError' })
const flush = () => new Promise(resolve => setImmediate(resolve))

test('retryChunkLoad retries a chunk failure once, 500 ms later', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const { retryChunkLoad } = loadRecovery()
    let calls = 0
    const pending = retryChunkLoad(async () => {
        calls += 1
        if (calls === 1) {
            throw chunkError()
        }
        return 'provider'
    })

    await flush()
    t.mock.timers.tick(499)
    assert.equal(calls, 1)
    t.mock.timers.tick(1)
    assert.equal(await pending, 'provider')
    assert.equal(calls, 2)
})

test('retryChunkLoad gives up after one retry and never retries other errors', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const { retryChunkLoad } = loadRecovery()

    const chunkLoad = t.mock.fn(async () => {
        throw chunkError()
    })
    const rejected = assert.rejects(retryChunkLoad(chunkLoad), { name: 'ChunkLoadError' })
    await flush()
    t.mock.timers.tick(500)
    await rejected
    assert.equal(chunkLoad.mock.callCount(), 2)

    const sdkError = new Error('SDK initialization failed')
    const sdkLoad = t.mock.fn(async () => {
        throw sdkError
    })
    await assert.rejects(retryChunkLoad(sdkLoad), error => error === sdkError)
    assert.equal(sdkLoad.mock.callCount(), 1)
})

test('retryInitOnModalOpen runs init on each opening and retries a chunk failure once per opening', async () => {
    const { retryInitOnModalOpen, modal } = loadRecovery()
    const { init, loads } = controlledInit()
    const stop = retryInitOnModalOpen(init)

    modal._syncSelectedConnector({ id: 'tronlink' })
    assert.equal(loads.length, 0, 'modal updates while closed do nothing')

    modal._syncOpen(true)
    loads[0].reject(chunkError())
    await flush()
    assert.equal(loads.length, 2, 'one automatic retry')

    modal._syncSelectedConnector({ id: 'okx' })
    loads[1].reject(chunkError())
    await flush()
    assert.equal(loads.length, 2, 'selecting a connector does not allow another')

    modal._syncOpen(false)
    modal._syncOpen(true)
    assert.equal(loads.length, 3, 'reopening runs init again')

    modal._syncOpen(false)
    loads[2].reject(chunkError())
    await flush()
    assert.equal(loads.length, 3, 'no automatic retry after the modal closed')
    stop()
})

test('retryInitOnModalOpen does not retry non-chunk failures automatically', async () => {
    const { retryInitOnModalOpen, modal } = loadRecovery()
    const { init, loads } = controlledInit()
    const stop = retryInitOnModalOpen(init)

    modal._syncOpen(true)
    loads[0].reject(new Error('wallet discovery failed'))
    await flush()

    assert.equal(loads.length, 1)
    stop()
})

test('retryInitOnModalOpen joins a modal that is already open', async () => {
    const { retryInitOnModalOpen, modal } = loadRecovery()
    const { init, loads } = controlledInit()

    modal._syncOpen(true)
    const stop = retryInitOnModalOpen(init)
    loads[0].reject(chunkError())
    await flush()

    assert.equal(loads.length, 2)
    stop()
})

test('retryInitOnModalOpen cleanup stops retries for loads still in flight', async () => {
    const { retryInitOnModalOpen, modal } = loadRecovery()
    const { init, loads } = controlledInit()
    const stop = retryInitOnModalOpen(init)

    modal._syncOpen(true)
    stop()
    loads[0].reject(chunkError())
    await flush()

    assert.equal(loads.length, 1)
})
