import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveFallbackTransport } from '../dist/esm/evmUtils/resolveTransports.js'

const nodes = ['https://one.example', 'https://two.example']
const instantiate = transport => transport({ chain: undefined })

test('the fallback owns the retries and the inner transports never retry in place', () => {
    const bounded = instantiate(resolveFallbackTransport(nodes, { timeoutMs: 10_000, retryCount: 1 }))
    assert.equal(bounded.config.retryCount, 1, 'retryCount bounds the passes over the node list')
    assert.equal(bounded.value.transports.length, 2)
    for (const inner of bounded.value.transports) {
        assert.equal(inner.config.retryCount, 0, 'a hung node fails over instead of being retried')
        assert.equal(inner.config.timeout, 10_000)
    }
})

test('the shared defaults keep three passes and the 60 s timeout', () => {
    const shared = instantiate(resolveFallbackTransport(nodes))
    assert.equal(shared.config.retryCount, 3)
    for (const inner of shared.value.transports) {
        assert.equal(inner.config.retryCount, 0)
        assert.equal(inner.config.timeout, 60_000)
    }
})
