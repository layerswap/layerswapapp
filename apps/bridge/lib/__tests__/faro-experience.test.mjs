import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { createJourneyId } from '../faro-swap-lifecycle.ts'
import { createEngagementClock } from '../faro-engagement.ts'

const compiled = ts.transpileModule(readFileSync(new URL('../../components/FaroExperience.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

for (const crypto of [undefined, {}, { randomUUID: () => 'secure-page-view-id' }]) {
    test(`page-view effect runs with ${crypto?.randomUUID ? 'secure crypto' : crypto ? 'crypto without randomUUID' : 'no crypto'}`, () => {
        const previous = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
        Object.defineProperty(globalThis, 'crypto', { configurable: true, value: crypto })
        try {
            const records = []
            const effects = []
            const exports = {}
            const target = { addEventListener() {}, removeEventListener() {} }
            vm.runInNewContext(compiled, {
                exports, performance, queueMicrotask: fn => fn(), clearInterval() {},
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
