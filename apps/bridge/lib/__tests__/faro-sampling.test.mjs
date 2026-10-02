import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

// Browser shims must exist before the SDK loads: webStorage.js probes
// window.localStorage once at import time. Real installed CJS SDK, no jsdom.
const memory = new Map()
globalThis.window = globalThis
globalThis.localStorage = {
    getItem: key => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: key => memory.delete(key),
}
globalThis.document = { addEventListener() {}, visibilityState: 'visible' }

const require = createRequire(import.meta.url)
const webDir = dirname(require.resolve('@grafana/faro-web-sdk'))
const sdkRequire = createRequire(require.resolve('@grafana/faro-web-sdk'))
const coreDir = dirname(sdkRequire.resolve('@grafana/faro-core'))
const {
    initializeFaro, PersistentSessionsManager, SessionInstrumentation, SESSION_EXPIRATION_TIME, SESSION_INACTIVITY_TIME,
} = require('@grafana/faro-web-sdk')
// Not public exports in faro-web-sdk 2.11.0; same internal-path pattern as faro-policy.test.mjs.
const { isSampled } = require(join(webDir, 'instrumentations/session/sessionManager/sampling.js'))
const { STORAGE_UPDATE_DELAY } = require(join(webDir, 'instrumentations/session/sessionManager/sessionConstants.js'))
const { mockConfig } = require(join(coreDir, 'testUtils/mockConfig.js'))
// Dynamic so the SDK (transitively imported) loads after the shims above.
const { createSessionSampler, getSessionTrackingConfig, parseSamplingRate } = await import('../faro-sampling.ts')
const { SwapContextInstrumentation, createWalletContextWriter } = await import('../faro-session-context.ts')

const fetchStored = () => PersistentSessionsManager.fetchUserSession()

function boot(rawRate, stored) {
    memory.clear()
    if (stored) PersistentSessionsManager.storeUserSession(stored)
    const sent = []
    let write
    const faro = initializeFaro(mockConfig({
        sessionTracking: getSessionTrackingConfig(rawRate, fetchStored),
        // Same order as faro.ts: app context instrumentation first, then the SDK session instrumentation.
        instrumentations: [new SwapContextInstrumentation(writer => { write = writer }), new SessionInstrumentation()],
        transports: [{ name: 'memory', version: 'test', isBatched: () => false, send: item => sent.push(item), getIgnoreUrls: () => [] }],
    }))
    const wallet = createWalletContextWriter(faro.api, listener => faro.metas.addListener(listener))
    return { faro, sent, write, wallet }
}

const seed = (id, sampled, extra = {}) => ({
    sessionId: id, started: Date.now(), lastActivity: Date.now(), isSampled: sampled,
    sessionMeta: { id, attributes: { isSampled: String(sampled) } }, ...extra,
})

function stubRandom(t) {
    const state = { next: 0.9 }
    const random = t.mock.method(Math, 'random', () => state.next)
    t.after(() => random.mock.restore())
    return state
}

test('T1 whole-session invariant: context writes never re-roll or split a session', t => {
    const random = stubRandom(t)
    const cases = [
        ['resumed sampled', seed('resumed-in', true), 0.9, 100],
        ['resumed unsampled', seed('resumed-out', false), 0.1, 0],
        ['fresh roll-in', null, 0.1, 100],
        ['fresh roll-out', null, 0.9, 0],
    ]
    for (const [label, stored, bootRoll, expectedDelivered] of cases) {
        random.next = bootRoll
        const h = boot('0.5', stored)
        const start = h.sent.length
        const ids = new Set()
        const flags = new Set()
        for (let i = 0; i < 100; i++) {
            random.next = i % 2 ? 0.1 : 0.9
            if (i % 2) assert.equal(h.write({ step: `step_${i}`, journey_id: 'journey' }), true, label)
            else assert.equal(h.wallet({ connected_wallet_count: String(i) }), true, label)
            h.faro.api.pushEvent(`event_${i}`, { i: String(i) })
            const session = h.faro.api.getSession()
            ids.add(session.id)
            flags.add(session.attributes.isSampled)
        }
        const delivered = h.sent.length - start
        assert(delivered === 0 || delivered === 100, `${label}: delivered ${delivered}/100, sessions must be wholly in or out`)
        assert.equal(delivered, expectedDelivered, label)
        assert.equal(flags.size, 1, `${label}: isSampled values ${[...flags]}`)
        assert.equal(ids.size, 1, `${label}: session ids ${[...ids]}`)
        assert.equal(fetchStored().isSampled, expectedDelivered === 100, `${label}: stored decision`)
    }
})

test('T2 stale same-id write: a context write during the stale window keeps the decision and the id', t => {
    const random = stubRandom(t)
    for (const [bootRoll, flipRoll] of [[0.9, 0.1], [0.1, 0.9]]) {
        for (const field of ['lastActivity', 'started']) {
            random.next = bootRoll
            const h = boot('0.5', null)
            const current = fetchStored()
            const stale = field === 'lastActivity' ? SESSION_INACTIVITY_TIME : SESSION_EXPIRATION_TIME
            PersistentSessionsManager.storeUserSession({ ...current, [field]: Date.now() - stale - 1 })
            const before = h.faro.api.getSession()
            random.next = flipRoll
            assert.equal(h.write({ step: 'after_idle', journey_id: 'journey' }), true)
            const after = h.faro.api.getSession()
            assert.equal(after.id, before.id, `${field}: id`)
            assert.equal(after.attributes.isSampled, before.attributes.isSampled, `${field}: isSampled`)
            assert.equal(after.attributes.step, 'after_idle', `${field}: context applied`)
            assert.equal(fetchStored().isSampled, before.attributes.isSampled === 'true', `${field}: stored decision`)
        }
    }
})

test('T3 rotation semantics: an expired session rotates in-page and the new session inherits the decision', t => {
    const random = stubRandom(t)
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.now() })
    t.after(() => t.mock.timers.reset())
    for (const [bootRoll, rotationRoll] of [[0.1, 0.9], [0.9, 0.1]]) {
        random.next = bootRoll
        const h = boot('0.5', null)
        const first = h.faro.api.getSession()
        assert.equal(first.attributes.isSampled, String(bootRoll < 0.5))
        PersistentSessionsManager.storeUserSession({ ...fetchStored(), started: Date.now() - SESSION_EXPIRATION_TIME - 1 })
        random.next = rotationRoll
        // The session-start signal consumed the throttle's leading call at boot; wait it out.
        t.mock.timers.tick(STORAGE_UPDATE_DELAY + 1)
        h.faro.api.pushEvent('rotation_trigger')
        const after = h.faro.api.getSession()
        assert.notEqual(after.id, first.id, 'session must have rotated')
        assert.equal(after.attributes.previousSession, first.id)
        assert.equal(after.attributes.isSampled, first.attributes.isSampled, 'rotated session inherits the chain decision')
        assert.equal(fetchStored().sessionId, after.id)
        assert.equal(fetchStored().isSampled, first.attributes.isSampled === 'true')
    }
})

test('T4 sampler and parseSamplingRate units', () => {
    const stored = { value: undefined }
    const sampler = createSessionSampler(0.3, () => stored.value)
    assert.equal(sampler({ metas: {} }), 0.3)
    stored.value = { sessionId: 'a', isSampled: false }
    assert.equal(sampler({ metas: { session: { id: 'a', attributes: { isSampled: 'true' } } } }), 0)
    stored.value = { sessionId: 'other', isSampled: false }
    assert.equal(sampler({ metas: { session: { id: 'a', attributes: { isSampled: 'true' } } } }), 1)
    const throwing = createSessionSampler(0.3, () => { throw new Error('storage unavailable') })
    assert.equal(throwing({ metas: { session: { id: 'a', attributes: { isSampled: 'false' } } } }), 0)
    assert.equal(throwing({ metas: { session: { id: 'a', attributes: {} } } }), 0.3)
    stored.value = null
    assert.equal(sampler({ metas: { session: { id: 'a' } } }), 0.3)
    assert.deepEqual(
        [undefined, '', 'abc', '7', '-1', '0.25'].map(parseSamplingRate),
        [1, 1, 1, 1, 0, 0.25],
    )
})

test('T5 SDK precedence guard: a numeric sampler result wins over samplingRate; storage API round-trips', t => {
    const random = stubRandom(t)
    const h = boot('0.5', null)
    const original = h.faro.config.sessionTracking
    try {
        h.faro.config.sessionTracking = { samplingRate: 0.5, sampler: () => 0 }
        random.next = 0
        assert.equal(isSampled(), false)
        h.faro.config.sessionTracking = { samplingRate: 0.5, sampler: () => 1 }
        random.next = 0.999
        assert.equal(isSampled(), true)
    }
    finally {
        h.faro.config.sessionTracking = original
    }
    assert.equal(typeof PersistentSessionsManager.fetchUserSession, 'function')
    PersistentSessionsManager.storeUserSession({ sessionId: 'round-trip', isSampled: false, started: Date.now(), lastActivity: Date.now() })
    const stored = fetchStored()
    assert.equal(stored.sessionId, 'round-trip')
    assert.equal(typeof stored.isSampled, 'boolean')
    assert.equal(stored.isSampled, false)
})

test('T6 config guard: getSessionTrackingConfig keeps the rate and adds the sampler', () => {
    const config = getSessionTrackingConfig('0.25', fetchStored)
    assert.equal(typeof config.sampler, 'function')
    assert.deepEqual({ ...config, sampler: undefined }, { enabled: true, persistent: true, samplingRate: 0.25, sampler: undefined })
    assert.equal(getSessionTrackingConfig(undefined, fetchStored).samplingRate, 1)
})

test('T7 any-writer property: arbitrary setSession attribute writes never change isSampled', () => {
    // Math.random deliberately unstubbed: the sampler must make the outcome deterministic on its own.
    const h = boot('0.5', null)
    const { id, attributes: { isSampled: decision } } = h.faro.api.getSession()
    const pool = ['step', 'journey_id', 'swap_id', 'custom_a', 'custom_b', 'connected_wallet_count']
    for (let i = 0; i < 500; i++) {
        const current = h.faro.api.getSession()
        const attributes = {}
        for (const key of pool) if (Math.random() < 0.5) attributes[key] = `${key}_${Math.floor(Math.random() * 4)}`
        if (Math.random() < 0.5) attributes.isSampled = current.attributes.isSampled
        h.faro.api.setSession({ ...current, attributes })
        const session = h.faro.api.getSession()
        assert.equal(session.id, id, `write ${i}: id`)
        assert.equal(session.attributes.isSampled, decision, `write ${i}: in-memory isSampled`)
        const stored = fetchStored()
        assert.equal(stored.sessionId, id, `write ${i}: stored id`)
        assert.equal(stored.isSampled, decision === 'true', `write ${i}: stored isSampled`)
    }
})
