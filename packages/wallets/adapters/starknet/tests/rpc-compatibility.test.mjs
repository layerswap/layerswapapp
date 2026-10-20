import assert from 'node:assert/strict'
import test from 'node:test'
import { ActionMessageType } from '@layerswap/widget-types'
import { StarknetAccountError } from '../dist/esm/service/starknetAccount.js'
import { normalizeWalletErrorCode } from '@layerswap/wallet-core/errors'
import { config, hash, WalletAccount } from 'starknet-rpc'
import { StarknetBalanceProvider } from '../dist/esm/starknetBalanceProvider.js'
import { StarknetNftProvider } from '../dist/esm/starknetNftProvider.js'
import { StarknetGasProvider } from '../dist/esm/starknetGasProvider.js'
import { useStarknetStore } from '../dist/esm/service/starknetStore.js'
import { starknetConnectorManager } from '../dist/esm/service/starknetConnectorManager.js'
import { StarknetConnectionService, resolveStarknetWallet } from '../dist/esm/service/StarknetConnectionService.js'
import { createStarknetTransfer } from '../dist/esm/transferProvider/createStarknetTransfer.js'

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

function mockRpc(t, specVersion) {
    const requests = []
    const originalFetch = config.get('fetch')
    t.after(() => config.set('fetch', originalFetch))
    config.set('fetch', async (url, options) => {
        assert.equal(url, network.node_url, 'Preserve the configured RPC URL')
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
            case 'starknet_chainId': result = chainId; break
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

async function connectWallet(version = '5.1.0') {
    const walletRequests = []
    const walletProvider = {
        on: () => {},
        request: async request => {
            walletRequests.push(request)
            if (request.type === 'wallet_requestAccounts') return [address]
            if (request.type === 'wallet_addInvokeTransaction') return { transaction_hash: '0xabc' }
            if (request.type === 'wallet_signTypedData') return ['0x1', '0x2']
            assert.fail(`Unexpected wallet request: ${request.type}`)
        },
    }
    Object.defineProperty(walletProvider, 'version', typeof version === 'function' ? { get: version } : { value: version })
    const wallet = await resolveStarknetWallet({
        name: 'Starknet',
        network: { id: network.name, displayName: 'Starknet Sepolia', chainId, rpcUrl: network.node_url },
        withdrawalSupportedNetworks: [network.name],
        disconnectWallets: async () => {},
        connector: {
            id: 'argentX', name: 'Ready', icon: '',
            wallet: walletProvider,
        },
    })
    assert.ok(wallet, 'Wallet initialization must succeed')
    return { wallet, walletRequests }
}

for (const specVersion of ['0.10.0', '0.10.1', '0.10.2', '0.10.3', '0.10.4', '0.9.0']) {
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
        assert.equal(wallet.version, '5.1.0')
        assert.ok(wallet.metadata.starknetAccount instanceof WalletAccount)
        assert.ok(wallet.metadata.starknetAccount.provider)
        assert.equal(typeof wallet.metadata.starknetAccount.getClassAt, 'undefined')
        assert.equal(wallet.metadata.starknetAccount.provider.readSpecVersion(), specVersion)

        const fee = await new StarknetGasProvider().getGas({ network, token, wallet, amount: 1.25 })
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

test('gas estimation converts fractional and scientific-notation amounts to base units', async () => {
    for (const [amount, decimals, baseUnits] of [
        [0.75, 18, 750000000000000000n],
        [0.1, 18, 100000000000000000n],
        [1.25, 6, 1250000n],
        [1e-8, 18, 10000000000n],
        [undefined, 18, 100000n],
    ]) {
        let calldata
        const wallet = { metadata: { starknetAccount: { estimateInvokeFee: async ([transfer]) => {
            calldata = transfer.calldata
            return { overall_fee: 1000n }
        } } } }
        await new StarknetGasProvider().getGas({ network, token: { ...token, decimals }, wallet, amount })
        assert.deepEqual(calldata.slice(1).map(BigInt), [baseUnits, 0n], `Encode ${amount} with ${decimals} decimals`)
    }
})

test('rejects unsupported RPC versions before requesting a balance', async t => {
    const requests = mockRpc(t, '0.8.1')
    await assert.rejects(new StarknetBalanceProvider().fetchBalance(address, network), /not compatible/)
    assert.deepEqual(requests.map(r => r.method), ['starknet_specVersion'])
})

test('resolution constructs the signing account from the currently authorized wallet account', async t => {
    mockRpc(t, '0.10.0')
    const current = '0x456'
    const wallet = await resolveStarknetWallet({
        name: 'Starknet',
        network: { id: network.name, chainId, rpcUrl: network.node_url },
        withdrawalSupportedNetworks: [network.name], disconnectWallets: async () => {},
        connector: { id: 'braavos', name: 'Braavos', icon: '', wallet: {
            on() {}, request: async () => [current],
        } },
    })
    assert.equal(wallet.address, current)
    assert.equal(wallet.metadata.starknetAccount.address, current)
})

test('a changed extension account prevents submission from the stale selected Starknet account', async t => {
    mockRpc(t, '0.10.0')
    const { wallet, walletRequests } = await connectWallet()
    wallet.metadata.starknetAccount.requestAccounts = async () => ['0x456']
    const calls = [{ contractAddress: token.contract, entrypoint: 'transfer', calldata: [] }]
    await assert.rejects(createStarknetTransfer().executeTransfer({ selectedWallet: wallet, callData: JSON.stringify(calls) }, wallet), error => {
        assert.match(error.message, /Starknet account changed/)
        assert.equal(error.name, ActionMessageType.WaletMismatch)
        assert.equal(normalizeWalletErrorCode(error), 'unauthorized')
        assert.equal(error.name, ActionMessageType.WaletMismatch)
        return true
    })
    assert.equal(walletRequests.some(request => request.type === 'wallet_addInvokeTransaction'), false)
})

test('wallet execute failures preserve the original error and selected signer/call context', async t => {
    mockRpc(t, '0.10.0')
    const { wallet } = await connectWallet()
    const original = Object.assign(new Error('Execute failed'), { code: 163, data: { revert_error: { revert_reason: 'contract failure' } } })
    wallet.metadata.starknetAccount.execute = async () => { throw original }
    const calls = [{ contractAddress: token.contract, entrypoint: 'transfer', calldata: ['secret-calldata'] }]
    await assert.rejects(createStarknetTransfer().executeTransfer({ selectedWallet: wallet, callData: JSON.stringify(calls) }, wallet), error => {
        assert.equal(error.message, 'Execute failed')
        assert.equal(error.cause.cause, original)
        assert.match(error.cause.message, /Ready X/)
        assert.match(error.cause.message, /selected account 0x123/)
        assert.match(error.cause.message, /0x456.transfer/)
        assert.doesNotMatch(error.cause.message, /secret-calldata/)
        return true
    })
})

for (const callData of ['null', '[]', '[{}]', '"invalid"']) {
    test(`invalid Starknet calls ${callData} do not open an execution prompt`, async t => {
        mockRpc(t, '0.10.0')
        const { wallet, walletRequests } = await connectWallet()
        await assert.rejects(createStarknetTransfer().executeTransfer({ selectedWallet: wallet, callData }, wallet), /Invalid Starknet transfer calls/)
        assert.equal(walletRequests.some(request => request.type === 'wallet_addInvokeTransaction'), false)
    })
}


test('a selected wallet without signing metadata cannot borrow the fallback wallet signer', async t => {
    mockRpc(t, '0.10.0')
    const { wallet, walletRequests } = await connectWallet()
    const calls = [{ contractAddress: token.contract, entrypoint: 'transfer', calldata: [] }]
    await assert.rejects(createStarknetTransfer().executeTransfer({ selectedWallet: { ...wallet, id: 'Braavos', metadata: undefined }, callData: JSON.stringify(calls) }, wallet), /Starknet account is unavailable/)
    assert.equal(walletRequests.some(request => request.type === 'wallet_addInvokeTransaction'), false)
})

test('restoration persists a changed account and updates the active selection without retrying stale wallets', async t => {
    mockRpc(t, '0.10.0')
    const previousState = useStarknetStore.getState()
    t.after(() => useStarknetStore.setState(previousState, true))
    const current = '0x456'
    const connector = { id: 'braavos', name: 'Braavos', icon: '', wallet: {
        on() {}, request: async () => [current],
    } }
    t.mock.method(starknetConnectorManager, 'getConnectors', () => [connector])
    useStarknetStore.setState({ starknetAccounts: { braavos: address }, activeWalletAddress: address, connectedWallets: [] })
    const service = new StarknetConnectionService()
    t.mock.method(service, 'getStarknetNetwork', () => ({ id: network.name, chainId, rpcUrl: network.node_url }))
    await service.hydrateStoredWallets()
    assert.equal(useStarknetStore.getState().starknetAccounts.braavos, current)
    assert.equal(service.buildProvider().activeWallet.address, current)
    await service.hydrateStoredWallets()
    assert.equal(useStarknetStore.getState().connectedWallets.length, 1)
})

test('silent account access with no authorized accounts gives unlock/reconnect guidance without submission', async t => {
    mockRpc(t, '0.10.0')
    const { wallet, walletRequests } = await connectWallet()
    wallet.metadata.starknetAccount.requestAccounts = async () => []
    const calls = [{ contractAddress: token.contract, entrypoint: 'transfer', calldata: [] }]
    await assert.rejects(createStarknetTransfer().executeTransfer({ selectedWallet: wallet, callData: JSON.stringify(calls) }, wallet), error => {
        assert.match(error.message, /No authorized Starknet account.*Unlock your wallet and reconnect/)
        assert.doesNotMatch(error.message, /account changed/)
        assert.equal(normalizeWalletErrorCode(error), 'unauthorized')
        assert.equal(error.name, ActionMessageType.WaletMismatch)
        return true
    })
    assert.equal(walletRequests.some(request => request.type === 'wallet_addInvokeTransaction'), false)
})

for (const [label, calldata, expected] of [
    ['no-argument entrypoint', undefined, []],
    ['raw object arguments', { recipient: '0x999', amount: '0x2' }, ['2457', '2']],
    ['compiled arguments', ['0x999', '0x2'], ['0x999', '0x2']],
]) {
    test(`${label} is prepared before invoking the Starknet wallet`, async t => {
        mockRpc(t, '0.10.0')
        const { wallet, walletRequests } = await connectWallet()
        const call = { contractAddress: token.contract, entrypoint: 'transfer', ...(calldata === undefined ? {} : { calldata }) }
        await createStarknetTransfer().executeTransfer({ selectedWallet: wallet, callData: JSON.stringify(call) })
        const invoke = walletRequests.find(request => request.type === 'wallet_addInvokeTransaction')
        assert.deepEqual(invoke.params.calls, [{ contract_address: token.contract, entry_point: 'transfer', calldata: expected }])
    })
}

test('connect, reconnect and restoration share one atomic connector replacement', async t => {
    mockRpc(t, '0.10.0')
    const previous = useStarknetStore.getState()
    t.after(() => useStarknetStore.setState(previous, true))
    useStarknetStore.setState({ connectedWallets: [], starknetAccounts: {}, activeWalletAddress: undefined })
    let current = address
    const connector = {
        id: 'braavos', name: 'Braavos', icon: '',
        connect: async () => ({ account: current, chainId: BigInt(chainId) }),
        wallet: { on() {}, request: async () => [current] },
    }
    t.mock.method(starknetConnectorManager, 'getConnector', () => connector)
    t.mock.method(starknetConnectorManager, 'getConnectors', () => [connector])
    const service = new StarknetConnectionService()
    t.mock.method(service, 'getStarknetNetwork', () => ({ id: network.name, chainId, rpcUrl: network.node_url }))
    const notifications = []
    const unsubscribe = useStarknetStore.subscribe(state => notifications.push(state))
    t.after(unsubscribe)
    const first = await service.connectWallet({ connector: { id: 'braavos' } })
    current = '0x456'
    const second = await service.connectWallet({ connector: { id: 'braavos' } })
    assert.notEqual(first.metadata.starknetAccount, second.metadata.starknetAccount)
    current = '0x789'
    await service.hydrateStoredWallets()
    assert.equal(notifications.length, 3, 'publish one consistent snapshot per resolution')
    for (const [index, expectedAddress] of [address, '0x456', '0x789'].entries()) {
        const snapshot = notifications[index]
        assert.deepEqual(snapshot.connectedWallets.map(wallet => wallet.address), [expectedAddress])
        assert.equal(snapshot.starknetAccounts.braavos, expectedAddress)
        assert.equal(snapshot.activeWalletAddress, expectedAddress)
    }
    assert.equal(service.buildProvider().activeWallet.address, current)
    const before = useStarknetStore.getState()
    connector.wallet.request = async () => []
    const warnings = []
    t.mock.method(console, 'warn', (...args) => warnings.push(args))
    assert.equal(await service.connectWallet({ connector: { id: 'braavos' } }), undefined)
    assert.equal(useStarknetStore.getState(), before, 'failed authorization must not persist an invalid signer')
    assert.ok(warnings[0][1] instanceof StarknetAccountError)
    assert.match(warnings[0][1].message, /Unlock your wallet and reconnect/)
})

test('restoring one connector keeps another connector selected and refreshes signer metadata', t => {
    const previous = useStarknetStore.getState()
    t.after(() => useStarknetStore.setState(previous, true))
    const store = useStarknetStore.getState()
    const braavos = { id: 'Braavos', providerName: 'Starknet', address, metadata: { starknetAccount: {} } }
    const ready = { ...braavos, id: 'Ready X', address: '0x456' }
    useStarknetStore.setState({ connectedWallets: [], starknetAccounts: {}, activeWalletAddress: undefined })
    store.replaceConnectorWallet('braavos', braavos, true)
    store.replaceConnectorWallet('argentX', ready, true)
    const refreshed = { ...braavos, address: '0x789', metadata: { starknetAccount: {} } }
    store.replaceConnectorWallet('braavos', refreshed)
    assert.equal(useStarknetStore.getState().activeWalletAddress, ready.address)
    store.replaceConnectorWallet('braavos', { ...refreshed, metadata: { starknetAccount: { refreshed: true } } })
    assert.equal(useStarknetStore.getState().connectedWallets.length, 2)
    assert.equal(useStarknetStore.getState().connectedWallets.find(wallet => wallet.id === braavos.id).metadata.starknetAccount.refreshed, true)
})

test('the selected connector owns the signer even when another wallet has the same address', async t => {
    mockRpc(t, '0.10.0')
    const { wallet: fallback } = await connectWallet()
    const { wallet: connected } = await connectWallet()
    const selected = { ...connected, id: 'Braavos' }
    let selectedSends = 0
    let fallbackSends = 0
    selected.metadata.starknetAccount.execute = async () => { selectedSends++; return { transaction_hash: '0xselected' } }
    fallback.metadata.starknetAccount.execute = async () => { fallbackSends++; return { transaction_hash: '0xfallback' } }
    const calls = [{ contractAddress: token.contract, entrypoint: 'transfer', calldata: [] }]
    const hash = await createStarknetTransfer().executeTransfer({ selectedWallet: selected, callData: JSON.stringify(calls) }, fallback)
    assert.equal(hash, '0xselected')
    assert.equal(selectedSends, 1)
    assert.equal(fallbackSends, 0)
})
