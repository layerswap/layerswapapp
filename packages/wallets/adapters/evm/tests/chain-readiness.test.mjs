import assert from 'node:assert/strict'
import test from 'node:test'
import { EventEmitter } from 'node:events'
import { mainnet } from 'viem/chains'
import { ensureEvmChain } from '../dist/esm/service/ensureEvmChain.js'

const account = '0x0000000000000000000000000000000000000001'
const otherAccount = '0x0000000000000000000000000000000000000002'
const flush = async () => { for (let i = 0; i < 100; i++) await Promise.resolve() }

function fixture(t, { onSwitch, onAdd, chainId = 10 } = {}) {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1000 })
    const state = { chainId, accounts: [account], ready: 0, starts: 0 }
    const calls = []
    const provider = new EventEmitter()
    provider.request = async ({ method, params }) => {
        calls.push({ method, params })
        if (method === 'eth_chainId') return `0x${state.chainId.toString(16)}`
        if (method === 'eth_accounts') return state.accounts
        if (method === 'wallet_switchEthereumChain') return onSwitch?.(state, provider)
        if (method === 'wallet_addEthereumChain') return onAdd?.(state, provider)
        assert.fail(`Unexpected request ${method}`)
    }
    const run = (options = {}) => ensureEvmChain({
        getProvider: async () => provider, chain: mainnet, account,
        onReady: () => { state.ready++ }, onSwitchStart: () => { state.starts++ }, ...options,
    })
    const prompts = () => calls.filter(({ method }) => method.startsWith('wallet_')).map(({ method }) => method)
    const clean = () => {
        for (const name of ['chainChanged', 'accountsChanged', 'disconnect']) assert.equal(provider.listenerCount(name), 0)
    }
    return { run, state, calls, prompts, provider, clean }
}

test('MetaMask-style cached chain state may update seconds after the RPC acknowledgement', async t => {
    const f = fixture(t)
    const result = f.run()
    await flush()
    assert.equal(f.state.starts, 1)
    for (let i = 0; i < 30; i++) { t.mock.timers.tick(100); await flush() }
    assert.equal(f.state.ready, 0)
    f.state.chainId = 1 // no chainChanged event: SDK cache finally caught up
    t.mock.timers.tick(100)
    await result
    assert.equal(f.state.ready, 1)
    assert.deepEqual(f.prompts(), ['wallet_switchEthereumChain'])
    f.clean()
})

test('chainChanged wakes verification immediately, but is not proof without provider state', async t => {
    const f = fixture(t)
    const result = f.run()
    await flush()
    f.provider.emit('chainChanged', '0x1')
    await flush()
    assert.equal(f.state.ready, 0)
    f.state.chainId = 1
    f.provider.emit('chainChanged', '0x1')
    await result
    assert.equal(f.state.ready, 1)
    f.clean()
})

test('an already-ready provider needs no network prompt', async t => {
    const f = fixture(t, { chainId: 1 })
    await f.run()
    assert.equal(f.state.ready, 1)
    assert.equal(f.state.starts, 0)
    assert.deepEqual(f.prompts(), [])
    f.clean()
})

for (const code of [4001, -32002, -32603, 4900]) {
    test(`RPC error ${code} is preserved without retrying or adding a chain`, async t => {
        const error = Object.assign(new Error('Provider failure'), { code })
        const f = fixture(t, { onSwitch: () => { throw error } })
        await assert.rejects(f.run(), e => e === error)
        assert.equal(f.state.ready, 0)
        assert.deepEqual(f.prompts(), ['wallet_switchEthereumChain'])
        f.clean()
    })
}

test('only a real unknown-chain response triggers addition and an explicit switch', async t => {
    let attempts = 0
    const f = fixture(t, { onSwitch: state => {
        if (++attempts === 1) throw { code: -32603, data: { originalError: { code: 4902 } } }
        state.chainId = 1
    } })
    await f.run()
    assert.deepEqual(f.prompts(), ['wallet_switchEthereumChain', 'wallet_addEthereumChain', 'wallet_switchEthereumChain'])
    assert.equal(f.state.ready, 1)
    f.clean()
})

test('a generic SwitchChainError never causes an add-chain request', async t => {
    const error = Object.assign(new Error('An error occurred when attempting to switch chain.'), { name: 'SwitchChainError', code: 4902 })
    const f = fixture(t, { onSwitch: () => { throw error } })
    await assert.rejects(f.run(), e => e === error)
    assert.deepEqual(f.prompts(), ['wallet_switchEthereumChain'])
    f.clean()
})

test('unknown-chain codes nested by the transport still add the chain, including string codes', async t => {
    let attempts = 0
    const f = fixture(t, { onSwitch: state => {
        if (++attempts === 1) throw new Error('Transport wrapper', { cause: { code: '4902' } })
        state.chainId = 1
    } })
    await f.run()
    assert.deepEqual(f.prompts(), ['wallet_switchEthereumChain', 'wallet_addEthereumChain', 'wallet_switchEthereumChain'])
    f.clean()
})

test('empty or missing add-chain overrides keep the chain defaults', async t => {
    let attempts = 0
    const f = fixture(t, { onSwitch: state => {
        if (++attempts === 1) throw { code: 4902 }
        state.chainId = 1
    } })
    await f.run({ addEthereumChainParameter: { rpcUrls: [], blockExplorerUrls: undefined, chainName: 'Custom' } })
    const [params] = f.calls.find(({ method }) => method === 'wallet_addEthereumChain').params
    assert.deepEqual(params.rpcUrls, mainnet.rpcUrls.default.http)
    assert.deepEqual(params.blockExplorerUrls, [mainnet.blockExplorers.default.url])
    assert.equal(params.chainName, 'Custom')
    f.clean()
})

test('MetaMask’s transient 1013 disconnect does not cancel a switch in progress', async t => {
    const f = fixture(t, { onSwitch: (state, provider) => {
        provider.emit('disconnect', { code: 1013, message: 'MetaMask: Disconnected from chain. Attempting to connect.' })
        state.chainId = 1
    } })
    await f.run()
    assert.equal(f.state.ready, 1)
    f.clean()
})

test('a rejection wins over nested unknown-chain diagnostics', async t => {
    const error = { code: 4001, data: { originalError: { code: 4902 } } }
    const f = fixture(t, { onSwitch: () => { throw error } })
    await assert.rejects(f.run(), e => e === error)
    assert.deepEqual(f.prompts(), ['wallet_switchEthereumChain'])
    f.clean()
})

test('a suspended browser cannot resume an expired operation before its timer fires', async t => {
    const late = Promise.withResolvers()
    const f = fixture(t, { onSwitch: () => late.promise })
    const result = assert.rejects(f.run(), { reasonCode: 'timeout' })
    await flush()
    t.mock.timers.setTime(61_001) // advance wall time without executing scheduled callbacks
    f.state.chainId = 1
    late.resolve()
    await result
    assert.equal(f.state.ready, 0)
    f.clean()
})

for (const stalledAt of ['switch_response', 'chain_cache']) {
    test(`timeout diagnostics identify ${stalledAt} without exposing account or request data`, async t => {
        const f = fixture(t, { onSwitch: () => stalledAt === 'switch_response' ? new Promise(() => {}) : undefined })
        const result = assert.rejects(f.run(), error => {
            assert.match(error.message, /last_chain=10/)
            assert.match(error.message, /chain_events=0/)
            if (stalledAt === 'switch_response') {
                assert.match(error.message, /phase=wallet_switchEthereumChain; switch_response=pending/)
            } else {
                assert.match(error.message, /phase=eth_chainId; switch_response=resolved/)
            }
            assert.equal(error.message.includes(account), false)
            return true
        })
        await flush()
        t.mock.timers.tick(60_000)
        await result
        f.clean()
    })
}

for (const stage of ['provider', 'switch', 'confirmation', 'add']) {
    test(`one deadline bounds ${stage}, and late responses cannot continue the operation`, async t => {
        const late = Promise.withResolvers()
        const f = fixture(t, {
            onSwitch: () => {
                if (stage === 'switch') return late.promise
                if (stage === 'add') throw { code: 4902 }
            },
            onAdd: () => late.promise,
        })
        const result = assert.rejects(f.run(stage === 'provider' ? { getProvider: () => late.promise } : {}), { reasonCode: 'timeout' })
        await flush()
        t.mock.timers.tick(60_000)
        await result
        const prompts = f.prompts()
        f.state.chainId = 1
        late.resolve(stage === 'provider' ? f.provider : undefined)
        await flush()
        assert.equal(f.state.ready, 0)
        assert.deepEqual(f.prompts(), prompts)
        f.clean()
    })
}

for (const event of ['cancel', 'accountsChanged', 'disconnect']) {
    test(`${event} stops waiting immediately and never confirms a late switch`, async t => {
        const late = Promise.withResolvers()
        const f = fixture(t, { onSwitch: () => late.promise })
        const controller = new AbortController()
        const result = assert.rejects(f.run({ signal: controller.signal }))
        await flush()
        if (event === 'cancel') controller.abort()
        else f.provider.emit(event, [otherAccount])
        await result
        f.state.chainId = 1
        late.resolve()
        await flush()
        assert.equal(f.state.ready, 0)
        assert.deepEqual(f.prompts(), ['wallet_switchEthereumChain'])
        f.clean()
    })
}

test('selected account is verified even when already on the right chain', async t => {
    const f = fixture(t, { chainId: 1 })
    f.state.accounts = [otherAccount]
    await assert.rejects(f.run(), { reasonCode: 'wallet_disconnected' })
    assert.equal(f.state.ready, 0)
    assert.deepEqual(f.prompts(), [])
    f.clean()
})

test('concurrent readiness attempts cannot issue duplicate switch prompts', async t => {
    const f = fixture(t)
    const first = f.run()
    await flush()
    await assert.rejects(f.run(), { code: -32002 })
    f.state.chainId = 1
    f.provider.emit('chainChanged', '0x1')
    await first
    assert.deepEqual(f.prompts(), ['wallet_switchEthereumChain'])
    f.clean()
})

test('a connection replaced while awaiting a response cannot become ready', async t => {
    let connected = true
    const f = fixture(t)
    const result = assert.rejects(f.run({ assertConnected: () => {
        if (!connected) throw new Error('Selected connection replaced')
    } }), /replaced/)
    await flush()
    connected = false
    f.state.chainId = 1
    f.provider.emit('chainChanged', '0x1')
    await result
    assert.equal(f.state.ready, 0)
    f.clean()
})
