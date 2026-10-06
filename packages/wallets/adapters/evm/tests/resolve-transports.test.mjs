import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'

// The built package keeps the bundler's extensionless relative imports.
const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
            try { return nextResolve(`${specifier}.js`, context) } catch { return nextResolve(`${specifier}/index.js`, context) }
        }
        return nextResolve(specifier, context)
    },
})
after(() => hooks.deregister())

const { resolveFallbackTransport, resolveNetworkNodes } = await import('../dist/esm/evmUtils/resolveTransports.js')

test('networks configured with node_url only still resolve an RPC URL', () => {
    assert.deepEqual(resolveNetworkNodes({ nodes: [], node_url: 'https://rpc.example.test' }), ['https://rpc.example.test'])
    assert.deepEqual(resolveNetworkNodes({ nodes: null, node_url: 'https://rpc.example.test' }), ['https://rpc.example.test'])
    assert.deepEqual(resolveNetworkNodes({ node_url: 'https://rpc.example.test' }), ['https://rpc.example.test'])
})

test('the nodes list wins over node_url when present', () => {
    assert.deepEqual(resolveNetworkNodes({ nodes: ['https://a.test', 'https://b.test'], node_url: 'https://c.test' }), ['https://a.test', 'https://b.test'])
})

test('the fallback transport resolves node_url-only networks itself', () => {
    const transport = resolveFallbackTransport({ nodes: [], node_url: 'https://rpc.example.test' })
    assert.deepEqual(transport({ retryCount: 0 }).value.transports.map(t => t.value.url), ['https://rpc.example.test'])
})

test('a network without any RPC URL fails with a clear error instead of an empty fallback transport', () => {
    assert.deepEqual(resolveNetworkNodes({ nodes: [], node_url: '' }), [])
    assert.throws(() => resolveFallbackTransport({ nodes: [], node_url: '' }), /No RPC nodes configured/)
})
