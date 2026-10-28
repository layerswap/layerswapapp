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
            estimateFeesPerGas: async () => { if (state.feesError) throw state.feesError; return state.fees },
            getGasPrice: async () => state.gasPrice,
            estimateMaxPriorityFeePerGas: async () => { state.priorityRequests++; if (state.priorityError) throw state.priorityError; return state.priorityFee },
            getCode: async () => state.accountCode,
            getBalance: async args => { state.balanceArgs = args; state.balanceRequests++; if (state.balanceError) throw state.balanceError; return state.balance },
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
const { toTransferError } = await import('../dist/esm/transferProvider/toTransferError.js')
const { createWalletClient, custom, InsufficientFundsError, parseUnits, parseTransaction } = await import('viem')
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
    priorityRequests: 0, feesError: undefined, priorityError: undefined, accountCode: '0x', estimateGas: () => 22_515n,
    balanceRequests: 0, balanceArgs: undefined, balanceError: undefined, balance: 20n * 10n ** 18n,
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
    const tx = await transactionBuilder({ ...params, network: { ...params.network, chain_id: '10' } })
    assert.equal(state.clients, 0)
    assert.equal(tx.gas, undefined)
    assert.equal(tx.maxFeePerGas, undefined)
    assert.equal(tx.value, 10n ** 18n)
    assert.equal(tx.data, '0x')
})

test('Monad does not fall back to wallet gas parameters when EIP-1559 fees are unavailable', async () => {
    state.fees = {}
    await assert.rejects(transactionBuilder(params), /EIP-1559 fee data is unavailable/)
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

test('Optimism L1 fees serialize the same deposit payload as the execution estimate', async () => {
    const action = {
        ...params, callData: '0x1234',
        network: { ...params.network, chain_id: '10', metadata: { evm_oracle_contract: `0x${'78'.repeat(20)}` } },
    }
    const quote = await new EVMGasProvider().getGas({
        network: action.network, token: action.token, amount: action.amount, callData: action.callData,
        address: action.selectedWallet.address, recipientAddress: action.depositAddress,
    })
    assert.ok(quote)
    const serialized = parseTransaction(state.l1Estimate.data)
    assert.equal(serialized.data, action.callData)
    assert.equal(serialized.to, action.depositAddress)
    assert.equal(serialized.value, 10n ** 18n)
    assert.deepEqual(state.nodes, [action.network.node_url])
    assert.equal(parseUnits(String(quote.gas), 18), 22_515n * state.fees.maxFeePerGas + state.l1Fee)
})

const bscAction = {
    ...params,
    network: { ...params.network, name: 'BSC_MAINNET', chain_id: '56', token: { symbol: 'BNB', decimals: 18 } },
    token: { symbol: 'BNB', decimals: 18 },
    callData: `0x${'12'.repeat(32)}`,
}

const quoteAction = action => new EVMGasProvider().getGas({
    address: action.selectedWallet.address, network: action.network,
    token: action.token, amount: action.amount, amountInBaseUnits: action.amountInBaseUnits,
    recipientAddress: action.depositAddress, callData: action.callData,
})

test('Ethereum does not quote gasPrice when its EIP-1559 cap RPC fails', async () => {
    state.feesError = new Error('fee estimate unavailable')
    const action = { ...bscAction, network: { ...bscAction.network, chain_id: '1' } }
    assert.equal(await quoteAction(action), undefined)
    await assert.rejects(transactionBuilder(action), /EIP-1559 fee data is unavailable/)
})

test('Ethereum does not quote an executable fee when priority data and its fallback fail', async () => {
    state.fees = { maxFeePerGas: 200_000_000n }
    state.priorityError = new Error('priority fee unavailable')
    const action = { ...bscAction, network: { ...bscAction.network, chain_id: '1' } }
    assert.equal(await quoteAction(action), undefined)
    await assert.rejects(transactionBuilder(action), /EIP-1559 fee data is unavailable/)
})

test('Ethereum quotes and submits a valid zero priority fee without requesting a fallback', async () => {
    state.fees.maxPriorityFeePerGas = 0n
    const action = { ...bscAction, network: { ...bscAction.network, chain_id: '1' } }
    const quote = await quoteAction(action)
    const tx = await transactionBuilder(action)
    assert.equal(parseUnits(String(quote.maxFee), 18), tx.gas * tx.maxFeePerGas)
    assert.equal(tx.maxPriorityFeePerGas, 0n)
    assert.equal(state.priorityRequests, 0)
})

test('BSC Max reserves and submits the same legacy price and buffered limit', async () => {
    state.balance = 534_967_843_846_153n
    state.gasPrice = 50_000_000n
    state.estimateGas = () => 22_615n
    // An unrelated 1559 cap must not affect a legacy quote or transaction.
    state.fees = { maxFeePerGas: 3_000_000_000n, maxPriorityFeePerGas: 1_000_000_000n }
    const quote = await quoteAction({ ...bscAction, amount: '0.000533814478846153' })
    const fee = parseUnits(String(quote.maxFee), 18)
    const bufferedFee = (fee * 102n + 99n) / 100n
    const action = { ...bscAction, amount: '0', amountInBaseUnits: String(state.balance - bufferedFee) }
    const tx = await transactionBuilder(action)
    assert.equal(tx.gas, 27_138n)
    assert.equal(tx.gasPrice, 50_000_000n)
    assert.equal(tx.maxFeePerGas, undefined)
    assert.equal(tx.maxPriorityFeePerGas, undefined)
    assert.equal(fee, tx.gas * tx.gasPrice)
    assert.ok(tx.value + fee <= state.balance)
    assert.deepEqual(state.balanceArgs, { address: tx.account, blockTag: 'pending' })
    assert.equal(state.priorityRequests, 0)
})

test('Ethereum Max budgets the explicit EIP-1559 cap rather than wallet defaults', async () => {
    state.balance = 330_390_000_000_000n
    state.estimateGas = () => 22_615n
    state.gasPrice = 100_000_000n
    state.fees = { maxFeePerGas: 355_992_205n, maxPriorityFeePerGas: 238_915_805n }
    const action = { ...bscAction, network: { ...bscAction.network, name: 'ETHEREUM_MAINNET', chain_id: '1' }, amount: '0' }
    const quote = await quoteAction(action)
    const fee = parseUnits(String(quote.maxFee), 18)
    const tx = await transactionBuilder({ ...action, amountInBaseUnits: String(state.balance - (fee * 102n + 99n) / 100n) })
    assert.equal(tx.gas, 27_138n)
    assert.equal(tx.maxFeePerGas, 355_992_205n)
    assert.equal(tx.maxPriorityFeePerGas, 238_915_805n)
    assert.equal(tx.gasPrice, undefined)
    assert.equal(fee, tx.gas * tx.maxFeePerGas)
    assert.ok(tx.value + fee <= state.balance)
})

for (const amount of ['0.000533814478846153', '0.00017042', '0.00015004', '0.00014413']) {
    test(`BSC blocks an unaffordable native amount before signing: ${amount}`, async () => {
        state.balance = amount === '0.000533814478846153' ? 534_967_843_846_153n : 201_580_604_423_077n
        state.gasPrice = 3_000_000_000n
        state.estimateGas = () => 22_615n
        await assert.rejects(transactionBuilder({ ...bscAction, amount }), error => {
            const mapped = toTransferError(error)
            assert.equal(mapped.name, 'InsufficientFunds')
            assert.equal(mapped.cause, error)
            return true
        })
    })
}

test('a fee increase after the quote blocks the fixed deposit amount instead of reducing it', async () => {
    state.balance = 534_967_843_846_153n
    state.gasPrice = 50_000_000n
    state.estimateGas = () => 22_615n
    const quote = await quoteAction({ ...bscAction, amount: '0' })
    const fee = parseUnits(String(quote.maxFee), 18)
    const amountInBaseUnits = String(state.balance - (fee * 102n + 99n) / 100n)
    state.gasPrice = 3_000_000_000n
    await assert.rejects(transactionBuilder({ ...bscAction, amount: '0', amountInBaseUnits }), InsufficientFundsError)
    assert.equal(state.estimate.value, BigInt(amountInBaseUnits))
})

test('token transfers also require enough native balance for the explicit gas budget', async () => {
    state.balance = 1n
    await assert.rejects(transactionBuilder({
        ...bscAction, token: { ...bscAction.token, contract: `0x${'56'.repeat(20)}` },
    }), InsufficientFundsError)
    assert.equal(state.estimate.value, 0n)
})

test('BSC refuses to silently return to wallet fees when its price is unavailable', async () => {
    state.gasPrice = undefined
    await assert.rejects(transactionBuilder(bscAction), /Legacy gas price is unavailable/)
    assert.equal(await quoteAction(bscAction), undefined)
})

test('balance RPC failure aborts preparation rather than assuming sufficient funds', async () => {
    state.balanceError = new Error('balance RPC unavailable')
    await assert.rejects(transactionBuilder(bscAction), error => error === state.balanceError)
})

for (const chainId of ['56', '1']) {
    test(`chain ${chainId} passes its quoted gas parameters through to eth_sendTransaction`, async () => {
        const action = { ...bscAction, network: { ...bscAction.network, chain_id: chainId } }
        const tx = await transactionBuilder(action)
        let sent
        const wallet = createWalletClient({ transport: custom({
            request: async ({ method, params }) => {
                if (method === 'eth_chainId') return `0x${Number(chainId).toString(16)}`
                assert.equal(method, 'eth_sendTransaction')
                sent = params[0]
                return `0x${'ab'.repeat(32)}`
            },
        }) })
        await wallet.sendTransaction({ ...tx, chain: null })
        assert.equal(BigInt(sent.gas), tx.gas)
        assert.equal(BigInt(sent.value), tx.value)
        if (chainId === '56') {
            assert.equal(BigInt(sent.gasPrice), tx.gasPrice)
            assert.equal(sent.maxFeePerGas, undefined)
        } else {
            assert.equal(BigInt(sent.maxFeePerGas), tx.maxFeePerGas)
            assert.equal(BigInt(sent.maxPriorityFeePerGas), tx.maxPriorityFeePerGas)
            assert.equal(sent.gasPrice, undefined)
        }
    })
}

test('the pending balance must cover the full fee cap, down to the last wei', async () => {
    state.estimateGas = () => 22_615n
    const value = 100_000n
    state.balance = value + 27_138n * state.gasPrice
    const action = { ...bscAction, amountInBaseUnits: String(value) }
    assert.equal((await transactionBuilder(action)).value, value)
    state.balance -= 1n
    await assert.rejects(transactionBuilder(action), InsufficientFundsError)
})
