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

const { EVMRpcHealthCheckProvider } = await import('../dist/esm/rpcHealthCheckProvider.js')
const { useEvmStore } = await import('../dist/esm/service/evmStore.js')

const settle = () => new Promise(resolve => setTimeout(resolve, 0))

function connectWallet(chainId, request) {
    const connector = { id: 'injected', getProvider: async () => ({ request }) }
    useEvmStore.setState({
        allConnectors: [connector],
        wagmiAccount: { ...useEvmStore.getState().wagmiAccount, address: '0x1', connectorId: 'injected', chainId },
    })
}

test('probe verdicts carry the chain they were measured on', async () => {
    connectWallet(1, async () => { throw new Error('RPC down') })
    const store = new EVMRpcHealthCheckProvider().createStore()
    const unsubscribe = store.subscribe(() => { })
    try {
        await settle()
        assert.deepEqual(store.getSnapshot().health, { status: 'unhealthy', reason: 'RPC down', chainId: 1 })

        connectWallet(10, async () => ({ timestamp: `0x${Math.floor(Date.now() / 1000).toString(16)}` }))
        await settle()
        const health = store.getSnapshot().health
        assert.equal(health.status, 'healthy')
        assert.equal(health.chainId, 10)
    } finally {
        unsubscribe()
    }
})
