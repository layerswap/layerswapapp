import assert from 'node:assert/strict'
import test from 'node:test'
import { runInNewContext } from '../../../../scripts/test-source.mjs'
import { createJourneyId } from '../faro-swap-lifecycle.ts'
import { createEngagementClock } from '../faro-engagement.ts'

const source = new URL('../../components/FaroExperience.tsx', import.meta.url)

for (const crypto of [undefined, {}, { randomUUID: () => 'secure-page-view-id' }]) {
    test(`page-view effect runs with ${crypto?.randomUUID ? 'secure crypto' : crypto ? 'crypto without randomUUID' : 'no crypto'}`, () => {
        const previous = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
        Object.defineProperty(globalThis, 'crypto', { configurable: true, value: crypto })
        try {
            const records = []
            const effects = []
            const target = { addEventListener() {}, removeEventListener() {} }
            const exports = runInNewContext(source, {
                performance, queueMicrotask: fn => fn(), clearInterval() {},
                window: { ...target, setInterval: () => 1 },
                document: { ...target, visibilityState: 'hidden', hasFocus: () => false },
                require: name => ({
                    react: { useEffect: effect => effects.push(effect) },
                    'next/router': { useRouter: () => ({ pathname: '/swap' }) },
                    '../lib/faro': { captureEvent: (name, attributes) => records.push({ name, attributes }) },
                    '../lib/faro-engagement': { createEngagementClock },
                    '../lib/faro-swap-lifecycle': { createJourneyId },
                })[name],
            })
            exports.default()
            const cleanup = effects[0]()
            cleanup()
            assert.equal(records.length, 1)
            assert.equal(records[0].attributes.step, 'page_viewed')
            assert.equal(records[0].attributes.route, '/swap')
            assert.match(records[0].attributes.page_view_id, crypto?.randomUUID ? /^secure-page-view-id$/ : /^[a-z0-9]+-[a-z0-9]+$/)
        } finally {
            if (previous) Object.defineProperty(globalThis, 'crypto', previous)
            else delete globalThis.crypto
        }
    })
}

// At-target DOM dispatch order: capture listeners run before non-capture ones.
function eventTarget() {
    const listeners = []
    const capture = options => options === true || Boolean(options?.capture)
    return {
        addEventListener(type, fn, options) { listeners.push({ type, fn, capture: capture(options) }) },
        removeEventListener(type, fn, options) {
            const index = listeners.findIndex(l => l.type === type && l.fn === fn && l.capture === capture(options))
            if (index >= 0) listeners.splice(index, 1)
        },
        dispatch(type) {
            const matching = listeners.filter(l => l.type === type)
            for (const l of [...matching.filter(l => l.capture), ...matching.filter(l => !l.capture)]) l.fn()
        },
        count: type => listeners.filter(l => l.type === type).length,
    }
}

test('final engagement is queued before the Faro batch flush registered ahead of hydration', () => {
    let time = 0
    const buffer = []
    const sent = []
    const effects = []
    const documentTarget = eventTarget()
    const document = Object.assign(documentTarget, { visibilityState: 'visible', hasFocus: () => true })
    // Faro's BatchExecutor registers this non-capture listener before the component mounts.
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sent.push(...buffer.splice(0)) })
    const exports = runInNewContext(source, {
        performance: { now: () => time }, queueMicrotask: fn => fn(), clearInterval() {},
        window: { ...eventTarget(), setInterval: () => 1 },
        document,
        require: name => ({
            react: { useEffect: effect => effects.push(effect) },
            'next/router': { useRouter: () => ({ pathname: '/swap' }) },
            '../lib/faro': { captureEvent: (name, attributes) => buffer.push(attributes) },
            '../lib/faro-engagement': { createEngagementClock },
            '../lib/faro-swap-lifecycle': { createJourneyId },
        })[name],
    })
    exports.default()
    const cleanup = effects[0]()
    time = 10_000
    document.visibilityState = 'hidden'
    document.dispatch('visibilitychange')
    assert.deepEqual(sent.map(record => record.step), ['page_viewed', 'engagement'])
    assert.equal(sent[1].active_ms, 10_000)
    assert.equal(buffer.length, 0)
    cleanup()
    assert.equal(document.count('visibilitychange'), 1)
})
