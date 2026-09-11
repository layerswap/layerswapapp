import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { readFileSync } from 'node:fs'
import { LogLevel, ConsoleInstrumentation } from '@grafana/faro-web-sdk'
import { getFaroVolumePolicy } from '../faro-policy.ts'
import { createSwapLifecycleTelemetry } from '../faro-swap-lifecycle.ts'

const require = createRequire(import.meta.url)
const webDir = dirname(require.resolve('@grafana/faro-web-sdk'))
const sdkRequire = createRequire(require.resolve('@grafana/faro-web-sdk'))
const coreDir = dirname(sdkRequire.resolve('@grafana/faro-core'))
const { initializeEventsAPI } = require(join(coreDir, 'api/events/initialize.js'))
const { initializeExceptionsAPI } = require(join(coreDir, 'api/exceptions/initialize.js'))
const { initializeFaro } = sdkRequire('@grafana/faro-core')
const { mockConfig } = require(join(coreDir, 'testUtils/mockConfig.js'))
const { observeResourceTimings } = require(join(webDir, 'instrumentations/performance/resource.js'))
const { __resetConsoleMonitorForTests } = require(join(webDir, 'instrumentations/_internal/monitors/consoleMonitor.js'))
const logger = { debug() {}, error() {}, warn() {} }

test('deployed builds retain warn/error; local builds retain verbosity; sampling unchanged', () => {
    const production = getFaroVolumePolicy('production')
    assert.deepEqual(production.consoleInstrumentation.disabledLevels, [LogLevel.DEBUG, LogLevel.TRACE, LogLevel.LOG, LogLevel.INFO])
    assert.equal(production.consoleInstrumentation.consoleErrorAsLog, false)
    assert.equal(production.trackResources, false)
    assert.equal(production.dedupe, true)
    for (const mode of ['development', 'test', undefined]) {
        assert.deepEqual(getFaroVolumePolicy(mode).consoleInstrumentation.disabledLevels, [])
        assert.equal(getFaroVolumePolicy(mode).trackResources, true)
        assert.equal(getFaroVolumePolicy(mode).dedupe, true)
    }
    assert(!('sessionTracking' in production), 'volume policy must not override sampling')
    const source = readFileSync(new URL('../faro.ts', import.meta.url), 'utf8')
    assert(source.includes('if (!value) return 1'))
    assert(source.includes('samplingRate: parseSamplingRate(process.env.NEXT_PUBLIC_FARO_SAMPLE_RATE)'))
    assert(source.includes('enablePerformanceInstrumentation: true'))
    assert(source.includes('new TracingInstrumentation('))
    assert(source.indexOf('new SwapContextInstrumentation(') < source.indexOf('...getWebInstrumentations('))
})

test('installed SDK dedupes identical errors/events but preserves real lifecycle attempt sequences', () => {
    const items = []
    const dependencies = {
        internalLogger: logger, config: { dedupe: getFaroVolumePolicy('production').dedupe },
        metas: { value: { session: { id: 'test-session' } } }, transports: { execute: item => items.push(item) },
        tracesApi: { getTraceContext: () => undefined }, userActionsApi: { getActiveUserAction: () => undefined },
    }
    const { pushEvent } = initializeEventsAPI(dependencies)
    const { pushError } = initializeExceptionsAPI(dependencies)
    const error = new Error('synthetic repeated failure')
    pushError(error); pushError(error)
    assert.equal(items.length, 1)
    pushEvent('test-repeat', { value: 'same' }); pushEvent('test-repeat', { value: 'same' })
    assert.equal(items.length, 2)
    const controller = createSwapLifecycleTelemetry({
        setSwapContext: () => true,
        captureEvent: (name, attributes) => { pushEvent(name, attributes); return true },
    })
    for (const step of ['form_submitted', 'swap_creation_started', 'wallet_connection_started', 'network_switch_started', 'wallet_prompt_opened', 'retry_requested']) {
        for (let repeat = 0; repeat < 2; repeat++) {
            controller.record({ step, stage: 'flow', outcome: 'pending', path: 'test' })
        }
    }
    const lifecycle = items.filter(item => item.payload.name === 'swap_lifecycle')
    assert.equal(lifecycle.length, 12)
    assert.deepEqual(lifecycle.filter(item => item.payload.attributes.step === 'wallet_prompt_opened').map(item => item.payload.attributes.attempt), ['1', '2'])
    controller.dispose()
})

test('installed console instrumentation actually filters deployed debug/log/info but keeps warn/error', () => {
    const logs = [], errors = []
    const instrumentation = new ConsoleInstrumentation()
    instrumentation.config = getFaroVolumePolicy('production')
    instrumentation.unpatchedConsole = Object.fromEntries(Object.values(LogLevel).map(level => [level, () => {}]))
    instrumentation.internalLogger = logger
    instrumentation.api = { pushLog: (args, options) => logs.push(options.level), pushError: error => errors.push(error) }
    try {
        instrumentation.initialize()
        for (const level of Object.values(LogLevel)) console[level]('synthetic console test')
    }
    finally {
        instrumentation.destroy()
        __resetConsoleMonitorForTests()
    }
    assert.deepEqual(logs, ['warn'])
    assert.equal(errors.length, 1)
    assert.match(errors[0].message, /synthetic console test/)
})

test('installed resource observer suppresses deployed resource events, retains local resource collection', () => {
    const original = globalThis.PerformanceObserver
    const originalDocument = globalThis.document
    globalThis.document = { visibilityState: 'visible' }
    let notify
    globalThis.PerformanceObserver = class {
        constructor(callback) { notify = callback }
        observe() {}
    }
    try {
        for (const [mode, expected] of [['production', 0], ['development', 1]]) {
            initializeFaro(mockConfig(getFaroVolumePolicy(mode)))
            const events = []
            observeResourceTimings('test-navigation', (...args) => events.push(args), { notify() {} })
            const entry = { name: 'https://test.invalid/app.js?version=safe', initiatorType: 'script',
                startTime: 0, duration: 25, serverTiming: [] }
            notify({ getEntries: () => [{ ...entry, toJSON: () => entry }] })
            assert.equal(events.length, expected)
            if (expected) assert.equal(events[0][0], 'faro.performance.resource')
        }
    }
    finally {
        if (original === undefined) delete globalThis.PerformanceObserver
        else globalThis.PerformanceObserver = original
        if (originalDocument === undefined) delete globalThis.document
        else globalThis.document = originalDocument
    }
})
