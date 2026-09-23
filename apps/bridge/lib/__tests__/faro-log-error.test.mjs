import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const compiled = ts.transpileModule(readFileSync(new URL('../../components/utils/logError.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function loadLogError(impact) {
    const records = []
    const exports = {}
    vm.runInNewContext(compiled, {
        exports, console, Error,
        require: name => ({
            '../../lib/faro': {
                captureEvent: (name, attributes) => records.push({ kind: 'event', name, attributes }),
                captureException: (error, context) => records.push({ kind: 'exception', error, context }),
            },
            '../../lib/faro-error-policy': { widgetErrorImpact: () => impact },
        })[name],
    })
    return { logError: exports.logError, records }
}

// Arbitrary widget-supplied details must never overwrite the classification fields.
const colliding = {
    source: 'spoofed', eventType: 'spoofed', impact: 'spoofed', occurrence_id: 'spoofed', reason_code: 'spoofed',
    error_category: 'spoofed', error_type: 'spoofed', extra: 'kept',
}
const event = { type: 'swap_error', message: 'failed', name: 'SwapError', occurrenceId: 'occ-1', reasonCode: 'rpc_error', ...colliding }

test('user-impact exceptions keep their own classification fields over colliding details', () => {
    const { logError, records } = loadLogError('user')
    logError(event)
    assert.equal(records.length, 1)
    const { context } = records[0]
    assert.equal(context.source, 'layerswap-widget')
    assert.equal(context.eventType, 'swap_error')
    assert.equal(context.impact, 'user')
    assert.equal(context.occurrence_id, 'occ-1')
    assert.equal(context.reason_code, 'rpc_error')
    assert.equal(context.extra, 'kept')
})

test('diagnostic events keep their own classification fields over colliding details', () => {
    const { logError, records } = loadLogError('diagnostic')
    logError(event)
    const { attributes } = records[0]
    assert.equal(attributes.source, 'layerswap-widget')
    assert.equal(attributes.impact, 'diagnostic')
    assert.equal(attributes.error_category, 'swap_error')
    assert.equal(attributes.error_type, 'SwapError')
    assert.equal(attributes.occurrence_id, 'occ-1')
    assert.equal(attributes.reason_code, 'rpc_error')
    assert.equal(attributes.extra, 'kept')
})
