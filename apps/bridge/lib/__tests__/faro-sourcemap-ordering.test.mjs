import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setImmediate } from 'node:timers/promises'
import test from 'node:test'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const pluginPath = require.resolve('@grafana/faro-webpack-plugin')
const pluginRequire = createRequire(pluginPath)
const shared = pluginRequire('@grafana/faro-bundlers-shared')
const webpack = pluginRequire('webpack')
const { AsyncSeriesHook, SyncHook } = createRequire(pluginRequire.resolve('webpack'))('tapable')

// Execute the pinned plugin and our real Next config; replace only network
// uploads and outer config wrappers. No credentials or remote service are used.
function configuredPlugin(upload, errors) {
    const pluginModule = { exports: {} }
    vm.runInNewContext(readFileSync(pluginPath, 'utf8'), {
        module: pluginModule,
        console: { ...console, error: error => errors.push(error) },
        require: name => name === '@grafana/faro-bundlers-shared'
            ? { ...shared, uploadCompressedSourceMaps: upload, uploadSourceMap: () => assert.fail('expected compressed upload') }
            : pluginRequire(name),
    })
    const module = { exports: {} }
    vm.runInNewContext(readFileSync(new URL('../../next.config.js', import.meta.url), 'utf8'), {
        module, console,
        process: { env: {
            FARO_SOURCEMAP_ENDPOINT: 'https://upload.invalid', FARO_SOURCEMAP_APP_ID: 'test-app',
            FARO_SOURCEMAP_API_KEY: 'synthetic-value', FARO_SOURCEMAP_STACK_ID: 'test-stack',
            VERCEL_GIT_COMMIT_SHA: 'test-sha',
            POSTHOG_PROJECT_ID: 'test-project', POSTHOG_API_KEY: 'synthetic-value',
            NEXT_PUBLIC_POSTHOG_HOST: 'https://posthog.invalid',
        } },
        require: name => {
            if (name === '@grafana/faro-webpack-plugin') return pluginModule.exports
            if (name === '@next/bundle-analyzer') return () => config => config
            if (name === '@posthog/nextjs-config') return { withPostHogConfig: config => config }
            if (name === './lib/faro-release.cjs') return require('../faro-release.cjs')
            return require(name)
        },
    })
    const config = module.exports(require('next/constants').PHASE_PRODUCTION_BUILD)
    return config.webpack({ resolve: {}, plugins: [] }, { isServer: false }).plugins[0]
}

test('all Faro upload batches finish before a later hook can delete source maps', async t => {
    const outputPath = mkdtempSync(join(tmpdir(), 'layerswap-faro-ordering-'))
    t.after(() => rmSync(outputPath, { recursive: true, force: true }))
    const chunksPath = join(outputPath, 'static/chunks')
    mkdirSync(chunksPath, { recursive: true })
    const sourceMap = JSON.stringify({ version: 3, sources: ['test.js'], mappings: '' })
    const files = ['first.js.map', 'second.js.map', 'third.js.map'].map(name => join(chunksPath, name))
    for (const file of files) writeFileSync(file, sourceMap)

    const gates = files.map(() => Promise.withResolvers())
    t.after(() => gates.forEach(gate => gate.resolve()))
    const order = []
    const uploaded = []
    const errors = []
    let batch = 0
    const plugin = configuredPlugin(async options => {
        const index = batch++
        order.push(`start-${index}`)
        assert.equal(options.keepSourcemaps, true)
        assert.equal(options.files.length, 1)
        await gates[index].promise
        for (const file of options.files) {
            assert.equal(readFileSync(file, 'utf8'), sourceMap)
            uploaded.push(file)
        }
        order.push(`finish-${index}`)
        return true
    }, errors)
    // Force multiple batches with tiny local fixtures in the pinned uploader.
    plugin.maxUploadSize = Buffer.byteLength(sourceMap)
    const compiler = { webpack, options: { output: { path: outputPath }, plugins: [] }, hooks: {
        compilation: new SyncHook(['compilation']),
        afterEmit: new AsyncSeriesHook(['compilation']),
        done: new AsyncSeriesHook(['stats']),
    } }
    plugin.apply(compiler)
    // Model PostHog's later done hook, including deletion after its upload.
    compiler.hooks.done.tapAsync('PostHogCleanup', (_stats, done) => {
        order.push('cleanup')
        for (const file of files) rmSync(file)
        done()
    })
    const completion = compiler.hooks.afterEmit.promise({}).then(() => compiler.hooks.done.promise({}))
    for (let index = 0; index < gates.length; index++) {
        await setImmediate()
        assert.equal(batch, index + 1)
        assert(!order.includes('cleanup'), 'cleanup must wait for every pending batch')
        gates[index].resolve()
    }
    await completion
    assert.deepEqual(errors, [])
    assert.deepEqual(uploaded.sort(), files.sort())
    assert.deepEqual(order, ['start-0', 'finish-0', 'start-1', 'finish-1', 'start-2', 'finish-2', 'cleanup'])
})
