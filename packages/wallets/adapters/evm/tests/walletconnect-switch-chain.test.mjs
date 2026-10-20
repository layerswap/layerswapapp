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
function setup({ onAdd = () => { }, onSecondSwitch, unknownChain = true }) {
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
            if (method === 'eth_chainId') return `0x${wallet.chainId.toString(16)}`
            calls.push(method)
            if (method === 'wallet_switchEthereumChain') {
                if (++switches === 1 && unknownChain) throw Object.assign(new Error('Unrecognized chain ID'), { code: 4902 })
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

test('already-selected chains do not request a switch', async () => {
    const { connector, calls } = setup({ onSecondSwitch: () => assert.fail('unexpected request') })
    await connector.switchChain({ chainId: 1 })
    assert.deepEqual(calls, [])
})

test('chain verification succeeds without a change event', async () => {
    const fixture = setup({ unknownChain: false, onSecondSwitch: () => { fixture.wallet.chainId = 10 } })
    await fixture.connector.switchChain({ chainId: 10 })
    assert.deepEqual(fixture.calls, ['wallet_switchEthereumChain'])
    assert.equal(fixture.emitter.size, 0)
})

for (const mode of ['unanswered request', 'missing chain update', 'unanswered add']) {
    test(`switch deadline bounds ${mode} without leaving listeners or retrying late`, async t => {
        t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 })
        const late = Promise.withResolvers()
        const fixture = setup({
            unknownChain: mode === 'unanswered add',
            onAdd: () => late.promise,
            onSecondSwitch: () => mode === 'unanswered request' ? late.promise : undefined,
        })
        const result = assert.rejects(fixture.connector.switchChain({ chainId: 10 }), /Timed out/)
        for (let i = 0; i < 30; i++) await Promise.resolve()
        t.mock.timers.tick(60_000)
        await result
        const callsBeforeLateResponse = [...fixture.calls]
        late.resolve()
        for (let i = 0; i < 30; i++) await Promise.resolve()
        assert.deepEqual(fixture.calls, callsBeforeLateResponse)
        assert.equal(fixture.emitter.size, 0)
        assert.deepEqual(fixture.requestedChains(), [])
    })
}

test('pending requests remain pending errors and never add the chain', async () => {
    const error = Object.assign(new Error('Request already pending'), { code: -32002 })
    const fixture = setup({ unknownChain: false, onSecondSwitch: () => { throw error } })
    await assert.rejects(fixture.connector.switchChain({ chainId: 10 }), e => e === error)
    assert.deepEqual(fixture.calls, ['wallet_switchEthereumChain'])
    assert.equal(fixture.emitter.size, 0)
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
