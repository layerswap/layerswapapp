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

const { walletConnect } = await import('../dist/esm/connectors/resolveConnectors/walletConnect.js')

const optimism = {
    id: 10,
    name: 'OP Mainnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://mainnet.optimism.io'] } },
}

function createEmitter() {
    const listeners = new Set()
    return {
        on: (_event, listener) => listeners.add(listener),
        off: (_event, listener) => listeners.delete(listener),
        emit: (_event, data) => [...listeners].forEach(listener => listener(data)),
        get size() { return listeners.size },
    }
}

/**
 * A wallet on chain 1 that does not know chain 10: the first switch fails with 4902.
 * `onAdd` and `onSecondSwitch` decide what the wallet does next.
 */
function setup({ onAdd = () => { }, onSecondSwitch }) {
    const emitter = createEmitter()
    const calls = []
    const wallet = { chainId: 1 }
    const moveTo = (chainId) => {
        wallet.chainId = chainId
        emitter.emit('change', { chainId })
    }
    let switches = 0
    const provider = {
        async request({ method }) {
            calls.push(method)
            if (method === 'wallet_switchEthereumChain') {
                if (++switches === 1) throw Object.assign(new Error('Unrecognized chain ID'), { code: 4902 })
                return onSecondSwitch(moveTo)
            }
            if (method === 'wallet_addEthereumChain') return onAdd(moveTo)
            throw new Error(`Unexpected ${method}`)
        },
    }
    const config = { chains: [{ ...optimism, id: 1 }, optimism], emitter, storage: null }
    const connector = walletConnect({
        projectId: 'test', id: 'test-wallet', name: 'Test Wallet', rdns: 'test.wallet', type: 'walletConnect', icon: '',
        mobile: { native: 'testwallet://', universal: 'https://test.wallet' },
    })(config)
    let requestedChains = []
    Object.assign(connector, {
        getProvider: async () => provider,
        getChainId: async () => wallet.chainId,
        getRequestedChainsIds: async () => requestedChains,
        setRequestedChainsIds: (chains) => { requestedChains = chains },
    })
    return { connector, calls, wallet, emitter, requestedChains: () => requestedChains }
}

test('adding an unknown chain asks the wallet to switch to it afterwards', async () => {
    const { connector, calls, wallet, emitter, requestedChains } = setup({ onSecondSwitch: moveTo => moveTo(10) })

    assert.equal((await connector.switchChain({ chainId: 10 })).id, 10)
    assert.deepEqual(calls, ['wallet_switchEthereumChain', 'wallet_addEthereumChain', 'wallet_switchEthereumChain'])
    assert.equal(wallet.chainId, 10)
    assert.deepEqual(requestedChains(), [10])
    assert.equal(emitter.size, 0)
})

test('a wallet that switches while adding is not asked again', async () => {
    const { connector, calls } = setup({ onAdd: moveTo => moveTo(10), onSecondSwitch: () => assert.fail('must not switch again') })

    await connector.switchChain({ chainId: 10 })
    assert.deepEqual(calls, ['wallet_switchEthereumChain', 'wallet_addEthereumChain'])
})

test('declining the switch after adding is a rejection, not a completed switch', async () => {
    const { connector, wallet, emitter, requestedChains } = setup({
        onSecondSwitch: () => { throw Object.assign(new Error('User rejected the request.'), { code: 4001 }) },
    })

    await assert.rejects(connector.switchChain({ chainId: 10 }), { name: 'UserRejectedRequestError' })
    assert.equal(wallet.chainId, 1)
    assert.deepEqual(requestedChains(), [])
    assert.equal(emitter.size, 0)
})
