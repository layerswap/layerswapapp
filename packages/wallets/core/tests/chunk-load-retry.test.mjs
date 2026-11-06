import assert from 'node:assert/strict'
import test from 'node:test'
import { retryChunkLoad } from '../dist/esm/lib/retryChunkLoad.js'

const chunkError = () => Object.assign(new Error('Loading chunk 6875 failed.'), { name: 'ChunkLoadError' })

test('successful loads return their value without retrying', async t => {
    const provider = { id: 'starknet' }
    const load = t.mock.fn(async () => provider)

    assert.equal(await retryChunkLoad(load), provider)
    assert.equal(load.mock.callCount(), 1)
})

test('a transient chunk failure retries after a short delay and recovers', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const provider = { id: 'starknet' }
    let attempts = 0
    const load = t.mock.fn(async () => {
        attempts += 1
        if (attempts === 1) {
            throw chunkError()
        }
        return provider
    })

    const pending = retryChunkLoad(load)
    await Promise.resolve()
    t.mock.timers.tick(499)
    assert.equal(load.mock.callCount(), 1)

    t.mock.timers.tick(1)
    assert.equal(await pending, provider)
    assert.equal(load.mock.callCount(), 2)
})

test('persistent chunk failures stop after one retry and preserve the final error', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const firstError = chunkError()
    const finalError = chunkError()
    let attempts = 0
    const load = t.mock.fn(async () => {
        attempts += 1
        throw attempts === 1 ? firstError : finalError
    })

    const rejected = assert.rejects(retryChunkLoad(load), error => error === finalError)
    await Promise.resolve()
    t.mock.timers.tick(500)
    await rejected
    t.mock.timers.tick(60_000)
    assert.equal(load.mock.callCount(), 2)

    // A later user-triggered load remains possible after automatic retries end.
    assert.equal(await retryChunkLoad(async () => 'ready'), 'ready')
})

test('SDK and application errors are propagated without retrying', async t => {
    const failures = [new Error('SDK initialization failed'), new TypeError('Invalid config'), null, undefined]
    for (const failure of failures) {
        const load = t.mock.fn(async () => {
            throw failure
        })
        await assert.rejects(retryChunkLoad(load), error => error === failure)
        assert.equal(load.mock.callCount(), 1)
    }
})

test('an application error on the retry is propagated without another attempt', async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const failure = new Error('Invalid provider configuration')
    let attempts = 0
    const load = t.mock.fn(async () => {
        attempts += 1
        throw attempts === 1 ? chunkError() : failure
    })

    const rejected = assert.rejects(retryChunkLoad(load), error => error === failure)
    await Promise.resolve()
    t.mock.timers.tick(500)
    await rejected
    assert.equal(load.mock.callCount(), 2)
})
