import assert from 'node:assert/strict'
import test, { after, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'

// Keep the transaction builder, policy and gas math real; replace RPC access.
const rpcUrl = `data:text/javascript,${encodeURIComponent(`
    export * from ${JSON.stringify(import.meta.resolve('viem'))}
    export const state = {}
    export const createPublicClient = () => {
        state.clients++
        return {
            estimateGas: async args => { state.estimate = args; return state.estimateGas(args) },
            estimateFeesPerGas: async () => state.fees,
            getGasPrice: async () => state.gasPrice,
            estimateMaxPriorityFeePerGas: async () => { state.priorityRequests++; return state.priorityFee },
            getCode: async () => state.accountCode,
            getBalance: async () => { state.balanceRequests++; return state.balance },
            extend: () => ({ estimateL1Fee: async args => { state.l1Estimate = args; return state.l1Fee } }),
        }
    }
    export default network => ({ id: Number(network.chain_id) })
    export const resolveFallbackTransport = nodes => {
        state.nodes = nodes
        if (!nodes.length || nodes.some(node => !node)) throw new Error('No RPC endpoint')
        return {}
    }
`)}`
const settingsUrl = `data:text/javascript,${encodeURIComponent(`
    import { state } from ${JSON.stringify(rpcUrl)}
    export default class { static get KnownSettings() { return state.settings } }
`)}`
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    const parent = context.parentURL ?? ''
    if ((parent.endsWith('/gasProviders/resolveEVMTransactionGasParameters.js') || parent.endsWith('/gasProviders/evmGasProvider.js')) && [
        'viem', '../evmUtils/resolveChain', '../evmUtils/resolveTransports',
    ].includes(specifier)) return { url: rpcUrl, shortCircuit: true }
    if (parent.includes('/dist/esm/gasProviders/') && specifier === '../NetworkSettings') return { url: settingsUrl, shortCircuit: true }
    if (specifier.startsWith('.') && !extname(specifier) && parent.includes('/dist/esm/')) {
        return nextResolve(`${specifier}.js`, context)
    }
    return nextResolve(specifier, context)
} })
const { state } = await import(rpcUrl)
const { transactionBuilder } = await import('../dist/esm/transferProvider/transactionBuilder.js')
const { EVMGasProvider } = await import('../dist/esm/gasProviders/evmGasProvider.js')
const { parseUnits, parseTransaction } = await import('viem')
const token = { symbol: 'MON', decimals: 18 }
const params = {
    amount: 1,
    depositAddress: `0x${'12'.repeat(20)}`,
    selectedWallet: { address: `0x${'34'.repeat(20)}` },
    network: { name: 'MONAD_MAINNET', chain_id: '143', nodes: [], node_url: 'https://rpc.example', token },
    token,
}
beforeEach(() => Object.assign(state, {
    clients: 0, estimate: undefined,
    nodes: undefined, settings: {}, gasPrice: 102_000_000_000n, priorityFee: 2_000_000_000n,
    priorityRequests: 0, accountCode: '0x', estimateGas: () => 22_515n,
    balanceRequests: 0, balance: 20n * 10n ** 18n,
    l1Fee: 1_000_000_000n, l1Estimate: undefined,
    fees: { maxFeePerGas: 122_000_000_000n, maxPriorityFeePerGas: 2_000_000_000n },
}))
after(() => hooks.deregister())

test('Monad native transfers preserve empty calldata and explicit gas units and fees', async () => {
    const tx = await transactionBuilder({ ...params, callData: '' })
    assert.equal(tx.value, 10n ** 18n)
    assert.equal(tx.data, '0x')
    assert.equal(tx.gas, 24_204n)
    assert.equal(tx.maxFeePerGas, 122_000_000_000n)
    assert.equal(tx.maxPriorityFeePerGas, 2_000_000_000n)
    assert.deepEqual(state.estimate, { account: tx.account, to: tx.to, data: '0x', value: tx.value })
})

test('Monad token transfers retain calldata without attaching native value', async () => {
    const tx = await transactionBuilder({ ...params, token: { ...params.token, contract: `0x${'56'.repeat(20)}` }, callData: '0x1234' })
    assert.equal(tx.value, 0n)
    assert.equal(tx.data, '0x1234')
    assert.equal(state.estimate.value, 0n)
    assert.equal(tx.gas, 24_204n)
})

test('other EVM chains continue to let the wallet set gas parameters', async () => {
    const tx = await transactionBuilder({ ...params, network: { ...params.network, chain_id: '1' } })
    assert.equal(state.clients, 0)
    assert.equal(tx.gas, undefined)
    assert.equal(tx.maxFeePerGas, undefined)
    assert.equal(tx.value, 10n ** 18n)
    assert.equal(tx.data, '0x')
})

test('Monad does not fall back to wallet gas parameters when EIP-1559 fees are unavailable', async () => {
    state.fees = {}
    await assert.rejects(transactionBuilder(params), /EIP-1559 fee data is unavailable for chain 143/)
})

test('gas quotes and submissions fall back to node_url when nodes is empty', async () => {
    const quote = await new EVMGasProvider().getGas({ ...params, address: params.selectedWallet.address })
    assert.ok(quote)
    assert.deepEqual(state.nodes, [params.network.node_url])
    await transactionBuilder(params)
    assert.deepEqual(state.nodes, [params.network.node_url])

    await transactionBuilder({ ...params, network: { ...params.network, nodes: ['https://preferred-rpc.example'] } })
    assert.deepEqual(state.nodes, ['https://preferred-rpc.example'])
})

test('exact deposit quotes budget the gas signed for the same recipient, calldata and value', async () => {
    state.estimateGas = args => args.value > 0n && args.data === '0x1234' && args.to === params.depositAddress ? 40_001n : 21_000n
    state.accountCode = `0xef0100${'78'.repeat(20)}`
    const action = { ...params, callData: '0x1234', amountInBaseUnits: '1000000000000000001' }
    const quote = await new EVMGasProvider().getGas({
        network: action.network, token: action.token, amount: action.amount,
        amountInBaseUnits: action.amountInBaseUnits, callData: action.callData,
        address: action.selectedWallet.address, recipientAddress: action.depositAddress,
    })
    assert.equal(state.estimate.to, action.depositAddress)
    assert.equal(state.estimate.data, action.callData)
    assert.equal(state.estimate.value, 1_000_000_000_000_000_001n)
    const tx = await transactionBuilder(action)
    assert.equal(tx.gas, 43_002n)
    assert.equal(tx.value, 1_000_000_000_000_000_001n)
    assert.equal(parseUnits(String(quote.maxFee), 18), tx.gas * tx.maxFeePerGas)
    assert.equal(quote.reserve, 10)
})

test('exact token deposit quotes preserve server calldata and destination with zero native value', async () => {
    const action = { ...params, token: { ...token, contract: `0x${'56'.repeat(20)}` }, callData: '0x1234' }
    const quote = await new EVMGasProvider().getGas({
        network: action.network, token: action.token, amount: action.amount,
        callData: action.callData, address: action.selectedWallet.address, recipientAddress: action.depositAddress,
    })
    assert.equal(state.estimate.to, action.depositAddress)
    assert.equal(state.estimate.data, action.callData)
    assert.equal(state.estimate.value, 0n)
    const tx = await transactionBuilder(action)
    assert.equal(parseUnits(String(quote.maxFee), 18), tx.gas * tx.maxFeePerGas)
})

test('a reserve-violating delegated native action remains quotable without changing submission state', async () => {
    state.accountCode = `0xef0100${'78'.repeat(20)}`
    const reserve = 10n * 10n ** 18n
    state.estimateGas = args => {
        const balance = args.stateOverride?.[0]?.balance ?? state.balance
        if (balance - args.value < reserve) throw new Error('reserve balance violation')
        return 40_001n
    }
    const action = { ...params, amount: 19, callData: '0x1234', amountInBaseUnits: '19000000000000000001' }
    const quote = await new EVMGasProvider().getGas({
        network: action.network, token: action.token, amount: action.amount,
        amountInBaseUnits: action.amountInBaseUnits, callData: action.callData,
        address: action.selectedWallet.address, recipientAddress: action.depositAddress,
    })
    assert.ok(quote)
    assert.equal(quote.reserve, 10)
    assert.ok(quote.maxFee >= quote.gas && quote.gas > 0)
    assert.equal(state.estimate.to, action.depositAddress)
    assert.equal(state.estimate.data, action.callData)
    assert.equal(state.estimate.value, 19_000_000_000_000_000_001n)
    assert.deepEqual(state.estimate.stateOverride, [{
        address: action.selectedWallet.address,
        balance: 29_000_000_000_000_000_001n,
    }])
    assert.equal(state.balance, 20n * 10n ** 18n)

    await assert.rejects(transactionBuilder(action), /reserve balance violation/)
    assert.equal(state.estimate.stateOverride, undefined)
})

test('an affordable delegated native quote preserves the actual sender balance', async () => {
    state.accountCode = `0xef0100${'78'.repeat(20)}`
    const quote = await new EVMGasProvider().getGas({
        ...params, address: params.selectedWallet.address,
        recipientAddress: params.depositAddress, callData: '',
    })
    assert.equal(quote.reserve, 10)
    assert.equal(state.balanceRequests, 1)
    assert.equal(state.estimate.stateOverride, undefined)
})

for (const [name, network, selectedToken, accountCode] of [
    ['undelegated Monad', params.network, token, '0x'],
    ['other EVM chains', { ...params.network, chain_id: '1' }, token, `0xef0100${'78'.repeat(20)}`],
    ['delegated token transfers', params.network, { ...token, contract: `0x${'56'.repeat(20)}` }, `0xef0100${'78'.repeat(20)}`],
]) {
    test(`${name} quotes do not request or override the sender balance`, async () => {
        state.accountCode = accountCode
        const quote = await new EVMGasProvider().getGas({
            network, token: selectedToken, amount: params.amount,
            address: params.selectedWallet.address,
            recipientAddress: params.depositAddress, callData: '0x1234',
        })
        assert.ok(quote)
        assert.equal(state.balanceRequests, 0)
        assert.equal(state.estimate.stateOverride, undefined)
    })
}

test('quotes and explicit transactions share the priority-fee floor and adjusted cap', async () => {
    state.settings[params.network.name] = { MinPriorityFeePerGasInGwei: 3 }
    const quote = await new EVMGasProvider().getGas({ ...params, address: params.selectedWallet.address })
    const tx = await transactionBuilder(params)
    assert.equal(tx.maxPriorityFeePerGas, 3_000_000_000n)
    assert.equal(tx.maxFeePerGas, 123_000_000_000n)
    assert.equal(parseUnits(String(quote.maxFee), 18), tx.gas * tx.maxFeePerGas)
})

test('missing priority-fee estimates use the shared RPC fallback', async () => {
    state.fees = { maxFeePerGas: 122_000_000_000n }
    const tx = await transactionBuilder(params)
    assert.equal(tx.maxPriorityFeePerGas, state.priorityFee)
    assert.equal(state.priorityRequests, 1)
})

test('a valid zero priority fee does not trigger a fallback estimate', async () => {
    state.fees.maxPriorityFeePerGas = 0n
    const tx = await transactionBuilder(params)
    assert.equal(tx.maxPriorityFeePerGas, 0n)
    assert.equal(state.priorityRequests, 0)
})

test('Optimism L1 data fees are quoted on the same deposit payload as the execution estimate', async () => {
    const action = {
        ...params, callData: '0x1234',
        network: { ...params.network, chain_id: '10', metadata: { evm_oracle_contract: `0x${'78'.repeat(20)}` } },
    }
    const quote = await new EVMGasProvider().getGas({
        network: action.network, token: action.token, amount: action.amount, callData: action.callData,
        address: action.selectedWallet.address, recipientAddress: action.depositAddress,
    })
    assert.ok(quote)
    assert.equal(state.l1Estimate.data, action.callData)
    assert.equal(state.l1Estimate.to, action.depositAddress)
    assert.equal(state.l1Estimate.value, 10n ** 18n)
    assert.equal(state.l1Estimate.gasPriceOracleAddress, action.network.metadata.evm_oracle_contract)
    assert.deepEqual(state.nodes, [action.network.node_url])
    assert.equal(parseUnits(String(quote.gas), 18), 22_515n * state.fees.maxFeePerGas + state.l1Fee)
    assert.equal(parseUnits(String(quote.maxFee), 18), 33_773n * state.fees.maxFeePerGas + state.l1Fee)
})

test('a quote without a deposit action models the eventual transfer and reserves the wallet-signed limit', async () => {
    const network = { ...params.network, chain_id: '1', metadata: { evm_oracle_contract: `0x${'78'.repeat(20)}` } }
    const quote = await new EVMGasProvider().getGas({ network, token, amount: 0.5, address: params.selectedWallet.address })
    assert.ok(quote)
    // Execution gas is estimated without value: the stand-in recipient is an EOA and no balance funds an unknown fee.
    assert.equal(state.estimate.value, 0n)
    assert.match(state.estimate.data, /^0x[0-9a-f]{64,}$/)
    assert.equal(state.estimate.stateOverride, undefined)
    // The data-posting fee is quoted on the payload the wallet will post, including its value.
    assert.equal(state.l1Estimate.to, state.estimate.to)
    assert.equal(state.l1Estimate.data, state.estimate.data)
    assert.equal(state.l1Estimate.value, parseUnits('0.5', 18))
    assert.equal(parseUnits(String(quote.gas), 18), 22_515n * state.fees.maxFeePerGas + state.l1Fee)
    assert.equal(parseUnits(String(quote.maxFee), 18), 33_773n * state.fees.maxFeePerGas + state.l1Fee)
    assert.equal(quote.reserve, undefined)
})

test('a token quote without a deposit action targets the token contract with a transfer plus memo', async () => {
    const contract = `0x${'56'.repeat(20)}`
    const quote = await new EVMGasProvider().getGas({
        network: { ...params.network, chain_id: '1' }, token: { ...token, contract }, amount: 0.5, address: params.selectedWallet.address,
    })
    assert.ok(quote)
    assert.equal(state.estimate.to, contract)
    assert.equal(state.estimate.value, 0n)
    assert.match(state.estimate.data, /^0xa9059cbb/)
    assert.equal(state.l1Estimate, undefined)
    assert.equal(parseUnits(String(quote.maxFee), 18), 33_773n * state.fees.maxFeePerGas)
})
