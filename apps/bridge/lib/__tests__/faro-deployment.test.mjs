import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import * as web from '@grafana/faro-web-sdk'
import * as sanitizer from '../faro-sanitizer.ts'
import * as sessionContext from '../faro-session-context.ts'
import * as policy from '../faro-policy.ts'
import { resolveFaroDeployment } from '../faro-release.cjs'

const require = createRequire(import.meta.url)
const sdkRequire = createRequire(require.resolve('@grafana/faro-web-sdk'))
const coreDir = dirname(sdkRequire.resolve('@grafana/faro-core'))
const { initializeFaro } = sdkRequire('@grafana/faro-core')
const { mockConfig } = require(join(coreDir, 'testUtils/mockConfig.js'))
const { MockTransport } = require(join(coreDir, 'testUtils/mockTransport.js'))
const { createPageMeta } = require(join(dirname(require.resolve('@grafana/faro-web-sdk')), 'metas/page/meta.js'))
const phases = require('next/constants')

// Execute the real build configuration with synthetic environment values. Only
// the uploader and outer wrappers are replaced, so tests cannot upload maps.
function buildConfig(env) {
    const module = { exports: {} }
    vm.runInNewContext(readFileSync(new URL('../../next.config.js', import.meta.url), 'utf8'), {
        module, process: { env }, console,
        require: name => {
            if (name === '@next/bundle-analyzer') return () => config => config
            if (name === '@posthog/nextjs-config') return { withPostHogConfig: config => config }
            if (name === '@grafana/faro-webpack-plugin') return class { constructor(options) { this.options = options } }
            if (name === './lib/faro-release.cjs') return require('../faro-release.cjs')
            return require(name)
        },
    })
    return module.exports(phases.PHASE_PRODUCTION_BUILD)
}

// Capture the actual initFaro options, then exercise their page metadata using
// the installed SDK below. This harness never contacts a collector.
function browserConfig(env) {
    let config
    const exports = {}
    const source = readFileSync(new URL('../faro.ts', import.meta.url), 'utf8')
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    vm.runInNewContext(compiled, {
        exports, process: { env }, window: {}, console,
        require: name => ({
            './faro-sanitizer': sanitizer,
            './faro-session-context': sessionContext,
            './faro-policy': policy,
            '@grafana/faro-web-sdk': { ...web, getInternalFaroFromGlobalObject: () => undefined,
                initializeFaro: options => { config = options; return {} } },
        })[name] ?? require(name),
    })
    exports.initFaro()
    assert(config)
    return config
}

test('deployment comes from platform target, independently of API mode and optimized build mode', () => {
    for (const mode of ['mainnet', 'testnet']) {
        const env = { NEXT_PUBLIC_API_VERSION: mode, NODE_ENV: 'production' }
        assert.equal(resolveFaroDeployment(env, true), 'unknown')
        assert.equal(resolveFaroDeployment({ ...env, GITHUB_SHA: 'sha' }, true), 'unknown')
        assert.equal(resolveFaroDeployment({ ...env, VERCEL_ENV: 'preview' }, true), 'preview')
        assert.equal(resolveFaroDeployment({ ...env, VERCEL_ENV: 'production' }, true), 'production')
        assert.equal(resolveFaroDeployment({ ...env, VERCEL_TARGET_ENV: 'staging', VERCEL_ENV: 'preview' }, true), 'staging')
        assert.equal(resolveFaroDeployment({ ...env, NEXT_PUBLIC_VERCEL_TARGET_ENV: 'staging', NEXT_PUBLIC_VERCEL_ENV: 'preview' }, true), 'staging')
        assert.equal(resolveFaroDeployment({ ...env, VERCEL_TARGET_ENV: '  ', VERCEL_ENV: 'preview' }, true), 'preview')
        assert.equal(resolveFaroDeployment({ ...env, VERCEL_ENV: 'development' }, true), 'local')
        assert.equal(resolveFaroDeployment({ ...env, VERCEL_ENV: 'production' }, false), 'local')
    }
})

test('real Next configuration aligns browser release/bundle identity with the source-map uploader', () => {
    for (const bundleOverride of [undefined, 'bundle-specific-id']) {
        const env = { VERCEL_TARGET_ENV: 'preview', VERCEL_GIT_COMMIT_SHA: 'commit-sha',
            NEXT_PUBLIC_API_VERSION: 'testnet', FARO_BUNDLE_ID: bundleOverride,
            FARO_SOURCEMAP_ENDPOINT: 'https://upload.invalid', FARO_SOURCEMAP_APP_ID: 'app',
            FARO_SOURCEMAP_API_KEY: 'synthetic-test-value', FARO_SOURCEMAP_STACK_ID: 'stack' }
        const next = buildConfig(env)
        const config = browserConfig({ ...env, ...next.env, NEXT_PUBLIC_FARO_COLLECTOR_URL: 'https://collector.invalid' })
        const webpack = next.webpack({ resolve: {}, plugins: [] }, { isServer: false })
        assert.equal(config.app.version, 'commit-sha')
        assert.equal(config.app.release, config.app.version)
        assert.equal(config.app.environment, 'testnet')
        const bundleKey = `__faroBundleId_${config.app.name}`
        const previousBundle = globalThis[bundleKey]
        try {
            // The SDK reads the webpack plugin's injected global, even when
            // app.bundleId is set explicitly. Model that preamble here.
            globalThis[bundleKey] = webpack.plugins[0].options.bundleId
            const client = initializeFaro(mockConfig({ app: config.app }))
            assert.equal(client.metas.value.app.bundleId, bundleOverride || 'commit-sha')
        }
        finally {
            if (previousBundle === undefined) delete globalThis[bundleKey]
            else globalThis[bundleKey] = previousBundle
        }
        assert.equal(config.pageTracking.page.attributes.deployment_environment, 'preview')
        assert(!Object.values(next.env).includes('synthetic-test-value'))
    }
})

test('SDK signals retain deployment metadata across navigation and session replacement without altering earlier snapshots', () => {
    const originalLocation = globalThis.location
    globalThis.location = { href: 'https://test.invalid/first', pathname: '/first' }
    try {
        const env = { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_SHA: 'commit-sha' }
        const config = browserConfig({ ...buildConfig(env).env, NEXT_PUBLIC_FARO_COLLECTOR_URL: 'https://collector.invalid' })
        const transport = new MockTransport()
        const client = initializeFaro(mockConfig({ app: config.app, beforeSend: config.beforeSend, transports: [transport],
            metas: [createPageMeta({ generatePageId: config.pageTracking.generatePageId, initialPageMeta: config.pageTracking.page })] }))
        client.api.setSession({ id: 'first-session', attributes: { swap_id: 'first-swap' } })
        client.api.pushEvent('first-route')
        globalThis.location = { href: 'https://test.invalid/second', pathname: '/second' }
        client.api.setSession({ id: 'adopted-session', attributes: { swap_id: 'second-swap' } })
        client.api.pushEvent('second-route')
        client.api.pushLog(['deployment check'])
        client.api.pushError(new Error('deployment check'))
        client.api.pushMeasurement({ type: 'web-vitals', values: { lcp: 123 } })
        assert.equal(transport.items.length, 5)
        for (const item of transport.items) {
            assert.equal(item.meta.page.attributes.deployment_environment, 'preview')
            assert.equal(item.meta.app.version, 'commit-sha')
            assert.equal(item.meta.app.release, 'commit-sha')
        }
        assert.equal(transport.items[0].meta.page.id, '/first')
        assert.equal(transport.items[0].meta.session.id, 'first-session')
        assert.equal(transport.items[0].meta.session.attributes.swap_id, 'first-swap')
        assert.equal(transport.items[1].meta.page.id, '/second')
        assert.equal(transport.items[1].meta.page.url, 'https://test.invalid/second')
        assert.equal(transport.items[1].meta.session.id, 'adopted-session')
        assert.equal(transport.items[1].meta.session.attributes.swap_id, 'second-swap')
    }
    finally {
        if (originalLocation === undefined) delete globalThis.location
        else globalThis.location = originalLocation
    }
})
