import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import * as Paradex from '@paradex/sdk'
import { config as legacyConfig } from 'starknet'
import { AuthorizeStarknet } from '../dist/esm/Authorize/Starknet.js'

// Exercise the same SDK version as the connected Starknet wallet, while
// Paradex retains its own v8 SDK for its separate chain.
const walletRequire = createRequire(import.meta.resolve('@layerswap/wallet-starknet'))
const { RpcProvider, WalletAccount } = await import(pathToFileURL(walletRequire.resolve('starknet-rpc')))

const config = {
    starknetChainId: 'SN_MAIN',
    ethereumChainId: '1',
    paradexChainId: 'PRIVATE_SN_PARACLEAR_MAINNET',
    paradexFullNodeRpcUrl: 'https://paradex.example/rpc',
    paraclearAccountHash: '0x123',
    paraclearAccountProxyHash: '0x456',
    paraclearAddress: '0x789',
    paraclearDecimals: 8,
    bridgedTokens: {},
}
const accountClassHash = '0x29927c8af6bccf3f6fda035981e765a7bdbf18a2dc0d630494f8758aa908e2b'

test('Paradex authorization uses the configured RPC v0.10 account even when public nodes are rate limited', async t => {
    const publicRequests = []
    const configuredRequests = []
    const walletRequests = []
    const originalFetch = legacyConfig.get('fetch')
    t.after(() => legacyConfig.set('fetch', originalFetch))
    legacyConfig.set('fetch', async (url, options) => {
        const request = JSON.parse(options.body)
        publicRequests.push({ url, method: request.method })
        if (request.method === 'starknet_getClassHashAt') {
            return Response.json({ jsonrpc: '2.0', id: request.id, result: accountClassHash })
        }
        return new Response('Too Many Requests\n', { status: 429 })
    })
    t.mock.method(Paradex.Config, 'fetch', async () => config)

    const nodeUrl = 'https://configured.example/rpc/v0_10?apiKey=test'
    const provider = await RpcProvider.create({
        nodeUrl,
        baseFetch: async (url, options) => {
            assert.equal(url, nodeUrl)
            const request = JSON.parse(options.body)
            configuredRequests.push(request)
            const results = {
                starknet_specVersion: '0.10.0',
                starknet_getClassHashAt: accountClassHash,
                starknet_getClassAt: {
                    abi: [{ type: 'interface', name: 'IAccount', items: [] }],
                    sierra_program: ['0x1'],
                    contract_class_version: '0.1.0',
                },
            }
            assert.ok(request.method in results, `Unexpected RPC method: ${request.method}`)
            return Response.json({ jsonrpc: '2.0', id: request.id, result: results[request.method] })
        },
    })
    const account = new WalletAccount({
        provider,
        address: '0x123',
        walletProvider: {
            on: () => {},
            request: async request => {
                assert.equal(request.type, 'wallet_signTypedData')
                assert.equal(request.params.domain.name, 'Paradex')
                walletRequests.push(request)
                return ['0x1234', '0x5678']
            },
        },
    })

    // Reproduce the original failure: without an explicit provider the SDK
    // reads a public node and tries to parse its plain-text HTTP 429 as JSON.
    await assert.rejects(Paradex.Client.fromStarknetAccount({ config, account }), /Too Many Requests/)
    assert.equal(publicRequests.length, 2)
    publicRequests.length = 0

    const client = await AuthorizeStarknet(account)
    assert.match(client.getAddress(), /^0x[0-9a-f]+$/)
    assert.equal(provider.readSpecVersion(), '0.10.0')
    assert.deepEqual(publicRequests, [])
    assert.deepEqual(configuredRequests.map(r => r.method), [
        'starknet_specVersion', 'starknet_getClassHashAt', 'starknet_getClassAt',
    ])
    assert.equal(walletRequests.length, 2)
    assert.deepEqual(walletRequests[0], walletRequests[1])
})
