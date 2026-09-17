import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import { ControllerConnector } from 'starknetkit/controller'

test('Cartridge can read its chain ID using the v8 connector SDK', async () => {
    const connectorRequire = createRequire(import.meta.resolve('starknetkit/controller'))
    const { RpcProvider, WalletAccount } = await import(pathToFileURL(connectorRequire.resolve('starknet')))
    const chainId = '0x534e5f5345504f4c4941'
    const requests = []
    const provider = new RpcProvider({
        nodeUrl: 'https://controller.example/rpc',
        specVersion: '0.9.0',
        baseFetch: async (_url, options) => {
            const request = JSON.parse(options.body)
            requests.push(request.method)
            assert.equal(request.method, 'starknet_chainId')
            return Response.json({ jsonrpc: '2.0', id: request.id, result: chainId })
        },
    })
    const account = new WalletAccount({
        provider,
        address: '0x123',
        walletProvider: { on: () => {} },
    })
    const connector = new ControllerConnector()
    connector.controller = { probe: async () => account }

    assert.equal(await connector.chainId(), BigInt(chainId))
    assert.deepEqual(requests, ['starknet_chainId'])
})
