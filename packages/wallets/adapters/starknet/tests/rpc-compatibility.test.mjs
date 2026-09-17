import assert from 'node:assert/strict'
import test from 'node:test'
import { config, hash, WalletAccount } from 'starknet-rpc'
import { StarknetBalanceProvider } from '../dist/esm/starknetBalanceProvider.js'
import { StarknetNftProvider } from '../dist/esm/starknetNftProvider.js'
import { StarknetGasProvider } from '../dist/esm/starknetGasProvider.js'
import { resolveStarknetWallet } from '../dist/esm/service/StarknetConnectionService.js'
import { createStarknetTransfer } from '../dist/esm/transferProvider/createStarknetTransfer.js'
import { STARKNET_MAINNET_RPC_URL } from '../dist/esm/utils/getStarknetRpcUrl.js'

const address = '0x123'
const token = { symbol: 'STRK', contract: '0x456', decimals: 6 }
const nftContract = '0x789'
const chainId = '0x534e5f5345504f4c4941'
const network = {
    name: 'STARKNET_SEPOLIA',
    type: 'starknet',
    node_url: 'https://rpc.example/custom/path?apiKey=test',
    token,
    tokens: [token],
}

function mockRpc(t, specVersion, expectedUrl = network.node_url, expectedChainId = chainId) {
    const requests = []
    const originalFetch = config.get('fetch')
    t.after(() => config.set('fetch', originalFetch))
    config.set('fetch', async (url, options) => {
        assert.equal(url, expectedUrl, 'Use the expected RPC endpoint for every request')
        const request = JSON.parse(options.body)
        requests.push(request)
        let result
        switch (request.method) {
            case 'starknet_specVersion': result = specVersion; break
            case 'starknet_call':
                assert.equal(request.params.request.entry_point_selector, hash.getSelectorFromName('balanceOf'))
                assert.deepEqual(request.params.request.calldata, [address])
                result = request.params.request.contract_address === nftContract ? ['0x3'] : ['0x1312d0', '0x0']
                break
            case 'starknet_chainId': result = expectedChainId; break
            case 'starknet_getNonce': result = '0x1'; break
            case 'starknet_getClassAt':
                result = { sierra_program: ['0x1'], contract_class_version: '0.1.0', abi: '[]', entry_points_by_type: { CONSTRUCTOR: [], EXTERNAL: [], L1_HANDLER: [] } }
                break
            case 'starknet_getBlockWithTxs':
                result = {
                    block_number: 100,
                    transactions: Array.from({ length: 10 }, () => ({ type: 'INVOKE', version: '0x3', tip: '0x0' })),
                }
                break
            case 'starknet_estimateFee':
                result = [{
                    l1_gas_consumed: '0x64', l1_gas_price: '0x64',
                    l1_data_gas_consumed: '0x64', l1_data_gas_price: '0x64',
                    l2_gas_consumed: '0x64', l2_gas_price: '0x64',
                    overall_fee: '0x7530', unit: 'FRI',
                }]
                break
            default: assert.fail(`Unexpected RPC method: ${request.method}`)
        }
        return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }))
    })
    return requests
}

async function connectWallet(walletNetwork = network, walletChainId = chainId) {
    const walletRequests = []
    const wallet = await resolveStarknetWallet({
        name: 'Starknet',
        address,
        network: { id: walletNetwork.name, displayName: 'Starknet', chainId: walletChainId, rpcUrl: walletNetwork.node_url },
        withdrawalSupportedNetworks: [walletNetwork.name],
        disconnectWallets: async () => {},
        connector: {
            id: 'argentX', name: 'Ready', icon: '',
            wallet: {
                on: () => {},
                request: async request => {
                    walletRequests.push(request)
                    if (request.type === 'wallet_requestAccounts') return [address]
                    if (request.type === 'wallet_addInvokeTransaction') return { transaction_hash: '0xabc' }
                    if (request.type === 'wallet_signTypedData') return ['0x1', '0x2']
                    assert.fail(`Unexpected wallet request: ${request.type}`)
                },
            },
        },
    })
    assert.ok(wallet, 'Wallet initialization must succeed')
    return { wallet, walletRequests }
}

for (const specVersion of ['0.10.0', '0.10.1', '0.10.2', '0.10.3', '0.10.3-rc.0', '0.10.4', '0.9.0']) {
    test(`token and NFT balances work with RPC ${specVersion}`, async t => {
        const requests = mockRpc(t, specVersion)
        const balances = await new StarknetBalanceProvider().fetchBalance(address, network)
        assert.equal(balances.length, 1)
        assert.equal(balances[0].amount, 1.25)
        assert.equal(balances[0].error, undefined)
        assert.equal(await new StarknetNftProvider().getBalance({ address, network, contractAddress: nftContract }), 3)
        assert.equal(requests.filter(r => r.method === 'starknet_specVersion').length, 2)
        assert.equal(requests.filter(r => r.method === 'starknet_call').length, 2)
        assert.ok(requests.filter(r => r.method === 'starknet_call').every(r => r.params.block_id === 'latest'))
    })

    test(`wallet fee estimation, transfers, and signing work with RPC ${specVersion}`, async t => {
        const requests = mockRpc(t, specVersion)
        const { wallet, walletRequests } = await connectWallet()
        assert.ok(wallet.metadata.starknetAccount instanceof WalletAccount)
        assert.ok(wallet.metadata.starknetAccount.provider)
        assert.equal(typeof wallet.metadata.starknetAccount.getClassAt, 'undefined')
        assert.equal(wallet.metadata.starknetAccount.provider.readSpecVersion(), specVersion.split('-')[0])

        const fee = await new StarknetGasProvider().getGas({ network, token, wallet, amount: '1000000' })
        assert.equal(fee.gas, 0.0675)
        assert.equal(fee.token, token)
        const estimate = requests.find(r => r.method === 'starknet_estimateFee')
        assert.deepEqual(estimate.params.simulation_flags, ['SKIP_VALIDATE'])
        assert.equal(estimate.params.request[0].sender_address, address)
        assert.equal(estimate.params.request[0].version, '0x100000000000000000000000000000003')
        assert.deepEqual(estimate.params.request[0].signature, [])
        assert.ok(estimate.params.request[0].resource_bounds.l1_data_gas)
        assert.ok(estimate.params.request[0].resource_bounds.l2_gas)

        const calls = [{ contractAddress: token.contract, entrypoint: 'transfer', calldata: ['0x999', '0xf4240', '0x0'] }]
        const txHash = await createStarknetTransfer().executeTransfer({ callData: JSON.stringify(calls) }, wallet)
        assert.equal(txHash, '0xabc')
        const invoke = walletRequests.find(r => r.type === 'wallet_addInvokeTransaction')
        assert.deepEqual(invoke.params.calls, [{ contract_address: token.contract, entry_point: 'transfer', calldata: calls[0].calldata }])

        // Paradex derives credentials via this wallet signing API.
        const typedData = { types: {}, primaryType: 'Message', domain: {}, message: {} }
        assert.deepEqual(await wallet.metadata.starknetAccount.signMessage(typedData), ['0x1', '0x2'])
        assert.deepEqual(walletRequests.at(-1), { type: 'wallet_signTypedData', params: typedData })
    })
}

test('rejects unsupported RPC versions before requesting a balance', async t => {
    const requests = mockRpc(t, '0.8.1')
    await assert.rejects(new StarknetBalanceProvider().fetchBalance(address, network), /not compatible/)
    assert.deepEqual(requests.map(r => r.method), ['starknet_specVersion'])
})

for (const [label, rpcUrl, expectedUrl] of [
    ['v0_8', 'https://rpc.example/rpc/v0_8/key', STARKNET_MAINNET_RPC_URL],
    ['v0_9', 'https://rpc.example/rpc/v0_9/key', STARKNET_MAINNET_RPC_URL],
    ['unversioned', 'https://rpc.example/rpc?apiKey=test', STARKNET_MAINNET_RPC_URL],
    ['v0_10 only in the query', 'https://rpc.example/rpc/v0_9/key?version=v0_10', STARKNET_MAINNET_RPC_URL],
    ['v0_100', 'https://rpc.example/rpc/v0_100/key', STARKNET_MAINNET_RPC_URL],
    ['v0_10', 'https://rpc.example/rpc/v0_10/custom-key?option=1', 'https://rpc.example/rpc/v0_10/custom-key?option=1'],
]) {
    test(`mainnet ${label} URL resolves consistently for balances, NFTs, and wallet fees`, async t => {
        const mainnet = { ...network, name: 'STARKNET_MAINNET', node_url: rpcUrl, chain_id: 'SN_MAIN' }
        const requests = mockRpc(t, '0.10.3-rc.0', expectedUrl, '0x534e5f4d41494e')
        const balances = await new StarknetBalanceProvider().fetchBalance(address, mainnet)
        assert.equal(balances[0].amount, 1.25)
        assert.equal(await new StarknetNftProvider().getBalance({ address, network: mainnet, contractAddress: nftContract }), 3)
        const { wallet } = await connectWallet(mainnet, '0x534e5f4d41494e')
        assert.equal((await new StarknetGasProvider().getGas({ network: mainnet, token, wallet, amount: '1000000' })).gas, 0.0675)
        assert.equal(requests.filter(r => r.method === 'starknet_specVersion').length, 3)
    })
}

test('custom network adapters identify mainnet by chain ID for the URL fallback', async t => {
    mockRpc(t, '0.10.3-rc.0', STARKNET_MAINNET_RPC_URL, '0x534e5f4d41494e')
    const { wallet } = await connectWallet({ ...network, name: 'custom-mainnet' }, '0x534e5f4d41494e')
    assert.ok(wallet)
})
