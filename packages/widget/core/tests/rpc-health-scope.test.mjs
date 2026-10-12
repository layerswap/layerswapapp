import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
      return nextResolve(`${specifier}.js`, context)
    }
    return nextResolve(specifier, context)
  },
})
after(() => hooks.deregister())

const { rpcHealthForNetwork, suggestRpcForNetwork } = await import('../dist/esm/lib/rpcHealth/scopeRpcHealth.js')

const source = { chain_id: '10' }
const chainDetails = { chainName: 'Optimism', nativeCurrency: { name: 'Optimism', symbol: 'ETH', decimals: 18 } }

test('an unhealthy verdict for the chain the wallet is leaving does not block the source network', () => {
  assert.deepEqual(rpcHealthForNetwork({ status: 'unhealthy', reason: 'down', chainId: 1 }, source), { status: undefined })
  assert.deepEqual(rpcHealthForNetwork({ status: 'healthy', latencyMs: 1, blockAgeSec: 1, chainId: 1 }, source), { status: undefined })
})

test('a verdict measured on the source chain is kept, whatever the id type', () => {
  const unhealthy = { status: 'unhealthy', reason: 'down', chainId: 10 }
  assert.equal(rpcHealthForNetwork(unhealthy, source), unhealthy)
  const healthy = { status: 'healthy', latencyMs: 1, blockAgeSec: 1, chainId: '10' }
  assert.equal(rpcHealthForNetwork(healthy, source), healthy)
})

test('unknown and untagged verdicts pass through', () => {
  const unknown = { status: undefined }
  assert.equal(rpcHealthForNetwork(unknown, source), unknown)
  const untagged = { status: 'unhealthy', reason: 'down' }
  assert.equal(rpcHealthForNetwork(untagged, source), untagged)
})

test('the RPC repair targets the source chain, not the wallet chain', async () => {
  const calls = []
  const store = { suggestRpc: async params => { calls.push(params); return { success: true } } }
  assert.deepEqual(await suggestRpcForNetwork(store, source, 'https://rpc.example', chainDetails), { success: true })
  assert.deepEqual(calls, [{ ...chainDetails, chainId: '0xa', rpcUrls: ['https://rpc.example'] }])
})

test('the RPC repair refuses a network without an EVM chain id', async () => {
  const store = { suggestRpc: async () => assert.fail('must not add a chain') }
  for (const chain_id of [undefined, null, '', 'SN_MAIN', '0']) {
    const result = await suggestRpcForNetwork(store, { chain_id }, 'https://rpc.example', chainDetails)
    assert.equal(result.success, false)
  }
})
