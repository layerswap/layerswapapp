import assert from 'node:assert/strict'
import test from 'node:test'
import { scheduleWalletPreload } from '../dist/esm/lib/walletConnect/scheduleWalletPreload.js'

function mockBrowser(t, { readyState = 'loading', idle = true } = {}) {
    const browser = new EventTarget()
    let idleCallback

    browser.setTimeout = (...args) => setTimeout(...args)
    browser.clearTimeout = id => clearTimeout(id)
    if (idle) {
        browser.requestIdleCallback = callback => {
            idleCallback = callback
            return 0
        }
        browser.cancelIdleCallback = () => { idleCallback = undefined }
    }

    for (const [key, value] of Object.entries({ window: browser, document: { readyState } })) {
        const previous = Object.getOwnPropertyDescriptor(globalThis, key)
        Object.defineProperty(globalThis, key, { configurable: true, value })
        t.after(() => {
            if (previous) Object.defineProperty(globalThis, key, previous)
            else delete globalThis[key]
        })
    }

    return {
        finishLoad() {
            document.readyState = 'complete'
            browser.dispatchEvent(new Event('load'))
        },
        runIdle() {
            const callback = idleCallback
            idleCallback = undefined
            callback?.()
        },
    }
}

test('waits for page load and browser idle before preloading', t => {
    const { finishLoad, runIdle } = mockBrowser(t)
    const preload = t.mock.fn()
    scheduleWalletPreload(preload)
    runIdle()
    assert.equal(preload.mock.callCount(), 0)
    finishLoad()
    assert.equal(preload.mock.callCount(), 0)
    runIdle()
    assert.equal(preload.mock.callCount(), 1)
})

test('browsers without idle callbacks preload shortly after page load', t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const { finishLoad } = mockBrowser(t, { idle: false })
    const preload = t.mock.fn()
    scheduleWalletPreload(preload)
    t.mock.timers.tick(1000)
    assert.equal(preload.mock.callCount(), 0)
    finishLoad()
    t.mock.timers.tick(199)
    assert.equal(preload.mock.callCount(), 0)
    t.mock.timers.tick(1)
    assert.equal(preload.mock.callCount(), 1)
})

test('unmounting cancels pending background loading', t => {
    const { runIdle } = mockBrowser(t, { readyState: 'complete' })
    const preload = t.mock.fn()
    const cancel = scheduleWalletPreload(preload)
    cancel()
    runIdle()
    assert.equal(preload.mock.callCount(), 0)
})
