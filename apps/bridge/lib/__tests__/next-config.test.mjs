import assert from 'node:assert/strict'
import test from 'node:test'
import { buildConfig, phases } from './helpers/next-config.mjs'

const { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } = phases

// Exact snapshot: any added or removed route header must show up as a visible edit here.
const expectedRoutes = [
    { source: '/:path*', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }] },
]

const framingHeader = /^(x-frame-options|content-security-policy(-report-only)?)$/i

async function routeHeaders(env, phase, options) {
    const config = await buildConfig(env, phase, options)
    assert.equal(typeof config.headers, 'function', `headers() must be defined under ${phase}`)
    // The config runs in a separate vm realm; re-materialise the plain data so strict
    // deep equality compares values rather than cross-realm prototypes.
    return JSON.parse(JSON.stringify(await config.headers()))
}

test('production build emits exactly the intended route headers', async () => {
    assert.deepEqual(await routeHeaders({}, PHASE_PRODUCTION_BUILD), expectedRoutes)
})

test('no framing policy is emitted unless explicitly configured', async () => {
    for (const phase of [PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER]) {
        const keys = (await routeHeaders({}, phase)).flatMap(route => route.headers.map(header => header.key))
        assert.ok(keys.length > 0, `${phase} emits route headers`)
        assert.deepEqual(keys.filter(key => framingHeader.test(key)), [], `${phase} must not emit framing headers`)
    }
})

test('route headers do not depend on the Next phase', async () => {
    const perPhase = await Promise.all(
        [PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER].map(phase => routeHeaders({}, phase)),
    )
    for (const routes of perPhase) assert.deepEqual(routes, perPhase[0])
})

test('headers survive the PostHog wrapper chain', async () => {
    const env = { POSTHOG_PROJECT_ID: 'p', POSTHOG_API_KEY: 'k', NEXT_PUBLIC_POSTHOG_HOST: 'https://h' }
    assert.deepEqual(await routeHeaders(env, PHASE_PRODUCTION_BUILD, { posthog: 'wrap' }), expectedRoutes)
})
