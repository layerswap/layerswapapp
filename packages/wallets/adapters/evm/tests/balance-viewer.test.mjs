import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { decodeFunctionData, encodeFunctionResult, erc20Abi } from 'viem'
import viewerAbi from '../src/jsons/BALANCEGETTERABI.json' with { type: 'json' }

// The package targets bundlers, which accept extensionless imports and JSON without attributes.
const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
            try { return nextResolve(`${specifier}.js`, context) }
            catch (error) {
                if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
                return nextResolve(`${specifier}/index.js`, context)
            }
        }
        return nextResolve(specifier, context)
    },
    load(url, context, nextLoad) {
        if (url.endsWith('/dist/esm/jsons/BALANCEGETTERABI.json')) {
            return { format: 'module', source: `export default ${readFileSync(new URL(url), 'utf8')}`, shortCircuit: true }
        }
        return nextLoad(url, context)
    },
})
after(() => hooks.deregister())
const { EVMBalanceProvider } = await import('../dist/esm/balanceProviders/evmBalanceProvider.js')

const owner = '0x0000000000000000000000000000000000000001'
const viewer = '0x0000000000000000000000000000000000000002'
const tokenAddress = '0x0000000000000000000000000000000000000003'
const options = { retryCount: 0, timeoutMs: 1000 }

async function fixture(t, { name = 'ETHEREUM_MAINNET', metadata, failViewer = false } = {}) {
    const calls = []
    const server = createServer(async (request, response) => {
        let body = ''
        for await (const chunk of request) body += chunk
        const call = JSON.parse(body)
        calls.push(call)
        let result
        let error
        if (call.method === 'eth_call' && call.params[0].to.toLowerCase() === viewer) {
            assert.deepEqual(decodeFunctionData({ abi: viewerAbi, data: call.params[0].data }), {
                functionName: 'getBalances', args: [owner, [tokenAddress]],
            })
            if (failViewer) error = { code: 3, message: 'execution reverted' }
            else result = encodeFunctionResult({ abi: viewerAbi, functionName: 'getBalances', result: [[true, true], [2500000n, 3000000000000000000n]] })
        } else if (call.method === 'eth_call' && call.params[0].to.toLowerCase() === tokenAddress) {
            result = encodeFunctionResult({ abi: erc20Abi, functionName: 'balanceOf', result: 2500000n })
        } else if (call.method === 'eth_getBalance') {
            assert.equal(call.params[0].toLowerCase(), owner)
            result = `0x${3000000000000000000n.toString(16)}`
        } else {
            error = { code: -32601, message: 'Unexpected RPC call' }
        }
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify({ jsonrpc: '2.0', id: call.id, ...(error ? { error } : { result }) }))
    })
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    t.after(() => {
        server.closeAllConnections()
        server.close()
    })
    const url = `http://127.0.0.1:${server.address().port}`
    const network = {
        name, display_name: 'Test network', chain_id: '1', type: 'evm',
        node_url: url, nodes: [url], metadata,
        token: { symbol: 'ETH', decimals: 18 },
        tokens: [{ symbol: 'ETH', decimals: 18, contract: null }, { symbol: 'USDC', decimals: 6, contract: tokenAddress }],
    }
    return { calls, network, provider: new EVMBalanceProvider() }
}

function assertBalances(balances, name) {
    assert.deepEqual(balances.map(({ network, token, amount, decimals, isNativeCurrency }) => ({ network, token, amount, decimals, isNativeCurrency })), [
        { network: name, token: 'USDC', amount: 2.5, decimals: 6, isNativeCurrency: false },
        { network: name, token: 'ETH', amount: 3, decimals: 18, isNativeCurrency: true },
    ])
}

for (const name of ['ARBITRUM_MAINNET', 'NEW_EVM_NETWORK']) {
    test(`uses the metadata address on ${name} and decodes token and native balances`, async t => {
        const f = await fixture(t, { name, metadata: { evm_balance_viewer_contract: viewer } })
        assertBalances(await f.provider.fetchBalance(owner, f.network, options), name)
        assert.equal(f.calls.length, 1)
        assert.equal(f.calls[0].params[0].to, viewer)
    })
}

for (const metadata of [undefined, {}, { evm_balance_viewer_contract: null }, { evm_balance_viewer_contract: '' }]) {
    test(`uses ordinary balances without a viewer RPC when metadata is ${JSON.stringify(metadata)}`, async t => {
        const f = await fixture(t, { metadata })
        assertBalances(await f.provider.fetchBalance(owner, f.network, options), f.network.name)
        assert.equal(f.calls.length, 2)
        assert.deepEqual(f.calls.map(call => call.method).sort(), ['eth_call', 'eth_getBalance'])
        assert.equal(f.calls.find(call => call.method === 'eth_call').params[0].to, tokenAddress)
    })
}

test('a reverting configured viewer falls back to token and native balance reads', async t => {
    t.mock.method(console, 'log', () => {})
    const f = await fixture(t, { metadata: { evm_balance_viewer_contract: viewer }, failViewer: true })
    assertBalances(await f.provider.fetchBalance(owner, f.network, options), f.network.name)
    assert.equal(f.calls[0].params[0].to, viewer)
    assert.equal(f.calls.length, 3)
})

test('a malformed viewer address preserves the balance fallback', async t => {
    t.mock.method(console, 'log', () => {})
    const f = await fixture(t, { metadata: { evm_balance_viewer_contract: 'invalid-address' } })
    assertBalances(await f.provider.fetchBalance(owner, f.network, options), f.network.name)
    assert.equal(f.calls.length, 2)
})
