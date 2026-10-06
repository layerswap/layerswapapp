import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'

const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier === '@layerswap/wallet-core' && context.parentURL?.endsWith('/atomicBatch.js')) {
            return { url: 'data:text/javascript,export const foregroundWalletApp = async () => {}; export const getDynamicWcMetadata = () => undefined', shortCircuit: true }
        }
        if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
            try { return nextResolve(`${specifier}.js`, context) } catch { return nextResolve(`${specifier}/index.js`, context) }
        }
        return nextResolve(specifier, context)
    },
})
after(() => hooks.deregister())
const { createAtomicBatchProvider } = await import('../dist/esm/transferProvider/atomicBatch.js')
const account = `0x${'3'.repeat(40)}`
const target = `0x${'2'.repeat(40)}`
const hash = `0x${'a'.repeat(64)}`

function walletHarness() {
    const requests = []
    const walletReads = { accounts: 0, chain: 0 }
    const state = { accounts: [account], chainId: 42161, atomic: 'supported', error: undefined, capabilitiesWait: undefined }
    const connector = {
        id: 'selected', name: 'Selected', uid: Math.random().toString(),
        getAccounts: async () => { walletReads.accounts++; return state.walletAccounts ?? state.accounts },
        getChainId: async () => { walletReads.chain++; return state.walletChainId ?? state.chainId },
        getProvider: async () => ({ request: async request => {
            requests.push(request)
            if (request.method === 'wallet_getCapabilities') {
                if (state.onCapabilities) return state.onCapabilities()
                if (state.capabilitiesWait) await state.capabilitiesWait
                return { '0xa4b1': { atomic: { status: state.atomic } } }
            }
            if (request.method === 'wallet_sendCalls') {
                if (state.error) throw state.error
                return { id: 'batch-original-wallet' }
            }
            if (request.method === 'wallet_getCallsStatus') return {
                id: request.params[0], chainId: '0xa4b1', version: '2.0.0', status: 200, atomic: true,
                receipts: [{ status: '0x1', transactionHash: hash, blockNumber: '0x1', gasUsed: '0x1' }],
            }
            assert.fail(`Unexpected RPC ${request.method}`)
        } }),
    }
    const other = { ...connector, id: 'other', name: 'Other', uid: 'other', getProvider: async () => assert.fail('must resolve selected connector explicitly') }
    const config = {
        chains: [{ id: 42161 }], state: { status: 'connected', current: other.uid, connections: new Map([
            [other.uid, { connector: other, accounts: [account], chainId: 42161 }],
            [connector.uid, { connector, get accounts() { return state.accounts }, get chainId() { return state.chainId } }],
        ]) }, subscribe: (_selector, listener) => { state.changed = listener; return () => {} },
    }
    const context = { wallet: { id: 'Selected', internalId: 'selected', address: account, metadata: { connectorId: 'selected', connectorUid: connector.uid } },
        account, network: { chain_id: '42161' }, calls: [{ to: target, data: '0x1234', value: 900719925474099312345678901n }],
        validBefore: Math.floor(Date.now() / 1000) + 600 }
    return { state, requests, walletReads, config, context, provider: createAtomicBatchProvider(config) }
}

test('uses the selected connector, exact wei, v2 atomicRequired and no fallback', async () => {
    const h = walletHarness()
    assert.deepEqual(await h.provider.submit(h.context), { id: 'batch-original-wallet' })
    const request = h.requests.find(r => r.method === 'wallet_sendCalls')
    assert.equal(request.params[0].atomicRequired, true)
    assert.equal(request.params[0].version, '2.0.0')
    assert.equal(request.params[0].from, account)
    assert.equal(request.params[0].chainId, '0xa4b1')
    assert.equal(BigInt(request.params[0].calls[0].value), h.context.calls[0].value)
    const result = await h.provider.getStatus(h.context, 'batch-original-wallet')
    assert.equal(result.receipts[0].transactionHash, hash)
    assert.equal(result.statusCode, 200)
})

for (const status of ['ready', 'unsupported']) test(`${status} cannot submit`, async () => {
    const h = walletHarness(); h.state.atomic = status
    assert.equal(await h.provider.getCapabilities(h.context), status)
    await assert.rejects(h.provider.submit(h.context), e => e.atomicSubmission === 'not_submitted')
    assert.equal(h.requests.some(r => r.method === 'wallet_sendCalls'), false)
})

test('capabilities cache includes connector, account, source and current chain; submission always rechecks', async () => {
    const h = walletHarness()
    await h.provider.getCapabilities(h.context)
    await h.provider.getCapabilities(h.context)
    assert.equal(h.requests.length, 1)
    h.state.chainId = 1
    await h.provider.getCapabilities(h.context)
    assert.equal(h.requests.length, 2)
    h.state.chainId = 42161; h.state.atomic = 'ready'
    await assert.rejects(h.provider.submit(h.context))
    assert.equal(h.requests.filter(r => r.method === 'wallet_getCapabilities').length, 3)
})

test('selection discovery and a cache hit avoid wallet account/chain round trips; submission still validates the live wallet', async () => {
    const h = walletHarness()
    assert.equal(await h.provider.getCapabilities(h.context), 'supported')
    assert.equal(await h.provider.getCapabilities(h.context), 'supported')
    assert.deepEqual(h.walletReads, { accounts: 0, chain: 0 })
    assert.equal(h.requests.length, 1)
    await h.provider.submit(h.context)
    assert.deepEqual(h.walletReads, { accounts: 2, chain: 2 })
    assert.equal(h.requests.filter(request => request.method === 'wallet_getCapabilities').length, 2)
})

test('selection discovery and swap creation share an in-flight capability request', async () => {
    const h = walletHarness()
    let release
    h.state.capabilitiesWait = new Promise(resolve => { release = resolve })
    const selectionCheck = h.provider.getCapabilities(h.context)
    while (!h.requests.length) await new Promise(resolve => setImmediate(resolve))
    const creationCheck = h.provider.getCapabilities(h.context)
    assert.equal(h.requests.length, 1)
    release()
    assert.deepEqual(await Promise.all([selectionCheck, creationCheck]), ['supported', 'supported'])
    assert.deepEqual(h.walletReads, { accounts: 0, chain: 0 })
})

test('a fresh check bypasses earlier discovery and its result cannot be overwritten by that older response', async () => {
    const h = walletHarness()
    let resolveOld, checks = 0
    h.state.onCapabilities = () => ++checks === 1 ? new Promise(resolve => { resolveOld = resolve })
        : { '0xa4b1': { atomic: { status: 'ready' } } }
    const oldCheck = h.provider.getCapabilities(h.context)
    while (!h.requests.length) await new Promise(resolve => setImmediate(resolve))
    assert.equal(await h.provider.getCapabilities(h.context, { fresh: true }), 'ready')
    resolveOld({ '0xa4b1': { atomic: { status: 'supported' } } })
    assert.equal(await oldCheck, 'supported')
    assert.equal(await h.provider.getCapabilities(h.context), 'ready')
    assert.equal(h.requests.length, 2)
})

test('cancelling selection discovery does not cancel a shared creation lookup', async () => {
    const h = walletHarness(), controller = new AbortController()
    let release
    h.state.capabilitiesWait = new Promise(resolve => { release = resolve })
    const selectionCheck = h.provider.getCapabilities({ ...h.context, signal: controller.signal })
    const cancelled = assert.rejects(selectionCheck, error => error.name === 'AbortError')
    while (!h.requests.length) await new Promise(resolve => setImmediate(resolve))
    const creationCheck = h.provider.getCapabilities(h.context)
    controller.abort()
    release()
    await cancelled
    assert.equal(await creationCheck, 'supported')
    assert.equal(h.requests.length, 1)
})

for (const change of ['account', 'chain']) test(`submission refuses a live ${change} change before connector state catches up`, async () => {
    const h = walletHarness()
    await h.provider.getCapabilities(h.context)
    if (change === 'account') h.state.walletAccounts = [`0x${'4'.repeat(40)}`]
    else h.state.walletChainId = 1
    await assert.rejects(h.provider.submit(h.context), error => error.atomicSubmission === 'not_submitted')
    assert.equal(h.requests.some(request => request.method === 'wallet_sendCalls'), false)
})

test('a live account change during the fresh capability check is refused before opening the wallet', async () => {
    const h = walletHarness(), prompts = []
    h.context.onWalletPrompt = () => prompts.push('opened')
    h.state.onCapabilities = () => {
        h.state.walletAccounts = [`0x${'4'.repeat(40)}`]
        return { '0xa4b1': { atomic: { status: 'supported' } } }
    }
    await assert.rejects(h.provider.submit(h.context), error => error.atomicSubmission === 'not_submitted')
    assert.deepEqual(prompts, [])
    assert.equal(h.requests.some(request => request.method === 'wallet_sendCalls'), false)
})

for (const change of ['account', 'chain', 'away-and-back']) test(`discards stale capability response after ${change} change`, async () => {
    const h = walletHarness()
    let release
    h.state.capabilitiesWait = new Promise(resolve => { release = resolve })
    const pending = h.provider.getCapabilities(h.context)
    while (!h.requests.length) await new Promise(resolve => setImmediate(resolve))
    if (change === 'account') h.state.accounts = [`0x${'4'.repeat(40)}`]
    if (change === 'chain') h.state.chainId = 1
    if (change === 'away-and-back') h.state.changed()
    release()
    await assert.rejects(pending, /changed/)
})

for (const code of [4001, -32601, 5760, -32603, 5720]) test(`RPC ${code} sends once and never falls back`, async () => {
    const h = walletHarness(); h.state.error = { code, message: 'RPC refused' }
    const error = await h.provider.submit(h.context).catch(e => e)
    assert.equal(h.requests.filter(r => r.method === 'wallet_sendCalls').length, 1)
    assert.equal(h.requests.some(r => r.method === 'eth_sendTransaction'), false)
    if (code === 4001) assert.equal(error.reasonCode, 'user_rejected')
    if (code === 5760 || code === -32601) assert.equal(error.atomicSubmission, 'not_submitted')
    if (code === -32603 || code === 5720) assert.equal(error.atomicSubmission, undefined)
})

test('expired calls and changed accounts/chains are refused before opening the wallet', async () => {
    for (const change of ['expiry', 'chain', 'account', 'value', 'address', 'calldata']) {
        const h = walletHarness()
        if (change === 'expiry') h.context.validBefore = 1
        if (change === 'chain') h.state.chainId = 1
        if (change === 'account') h.state.accounts = []
        if (change === 'value') h.context.calls[0].value = -1n
        if (change === 'address') h.context.calls[0].to = '0x123'
        if (change === 'calldata') h.context.calls[0].data = '0x123'
        await assert.rejects(h.provider.submit(h.context), e => e.atomicSubmission === 'not_submitted')
        assert.equal(h.requests.some(r => r.method === 'wallet_sendCalls'), false, change)
    }
})

test('atomic tracking refuses viem sequential fallback IDs before any hash RPC', async () => {
    const h = walletHarness()
    await assert.rejects(h.provider.getStatus(h.context, `0x${'a'.repeat(128)}${'5792'.repeat(16)}`), /Sequential/)
    assert.deepEqual(h.requests, [])
})
