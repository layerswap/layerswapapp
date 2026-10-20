import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(path, imports) {
    const module = { exports: {} }
    const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    })
    new Function('require', 'module', 'exports', outputText)(id => imports[id] ?? require(id), module, module.exports)
    return module.exports
}
const params = {
    amount: '0.000163036734120886', callData: '0x1234', depositAddress: '0x0000000000000000000000000000000000000002',
    selectedWallet: { address: '0x0000000000000000000000000000000000000001' }, network: { chain_id: '60808' }, token: {},
}

for (const affordable of [true, false]) test(`exact transaction fee budget: affordable=${affordable}`, async () => {
    let estimated
    const gas = 21140n, fees = { maxFeePerGas: 1000000000n, maxPriorityFeePerGas: 1n }, l1Fee = 474973262n
    const fee = gas * fees.maxFeePerGas + l1Fee
    const balance = affordable ? 1000000000000000n : 169158247102604n
    const { transactionBuilder } = load('../src/transferProvider/transactionBuilder.ts', {
        '../gasProviders/estimateTransferFee': { estimateTransferFee: async (network, request) => {
            estimated = request
            return { gas, fees, l1Fee, fee, client: { getBalance: async () => balance } }
        } },
    })
    if (affordable) {
        const tx = await transactionBuilder(params, {})
        assert.equal(tx.gas, gas) // gas units, never native-token fee
        assert.equal(tx.maxFeePerGas, fees.maxFeePerGas)
        assert.equal(tx.maxPriorityFeePerGas, fees.maxPriorityFeePerGas)
    } else {
        await assert.rejects(transactionBuilder(params, {}), error => {
            assert.equal(error.code, 'INSUFFICIENT_FUNDS')
            assert.equal(JSON.parse(error.cause.details).feeWei, '21140474973262')
            return true
        })
    }
    assert.equal(estimated.value, 163036734120886n)
    assert.equal(estimated.data, params.callData)
    assert.equal(estimated.account, params.selectedWallet.address)
    assert.equal(estimated.to, params.depositAddress)
})

for (const legacy of [true, false]) test(`fee estimation preserves units and L1 calldata (legacy=${legacy})`, async () => {
    const request = { account: params.selectedWallet.address, to: params.depositAddress, value: 123n, data: '0x1234' }
    let l1Request, executionRequest
    const client = {
        estimateGas: async tx => { executionRequest = tx; return 23000n },
        getBlock: async ({ blockTag }) => { assert.equal(blockTag, 'latest'); return { baseFeePerGas: legacy ? null : 20n } },
        estimateFeesPerGas: async () => ({ maxFeePerGas: 100n, maxPriorityFeePerGas: 1n }),
        getGasPrice: async () => 50n,
        extend: () => ({ estimateL1Fee: async tx => { l1Request = tx; return 12345n } }),
    }
    const { estimateTransferFee } = load('../src/gasProviders/estimateTransferFee.ts', {
        viem: { createPublicClient: () => client },
        'viem/op-stack': { publicActionsL2: () => ({}) },
        '../evmUtils/resolveChain': { default: () => ({}) },
        '../evmUtils/resolveTransports': { resolveFallbackTransport: () => ({}) },
        '../NetworkSettings': { default: { KnownSettings: {} } },
    })
    const result = await estimateTransferFee({ name: 'BOB', metadata: { evm_oracle_contract: '0xoracle' } }, request)
    assert.equal(result.gas, 23000n)
    assert.equal(result.fee, 23000n * (legacy ? 50n : 100n) + 12345n)
    assert.deepEqual(executionRequest, { ...request, ...(legacy ? { gasPrice: 50n } : { maxFeePerGas: 100n, maxPriorityFeePerGas: 1n }) })
    assert.deepEqual(l1Request, { ...request, chain: undefined, gasPriceOracleAddress: '0xoracle' })
})

for (const contract of [undefined, '0x0000000000000000000000000000000000000003']) test(`Max uses the shared fee policy and token quantity: contract=${!!contract}`, async () => {
    let request
    const token = { symbol: contract ? 'USDT' : 'ETH', decimals: contract ? 6 : 18, contract }
    const native = { symbol: 'ETH', decimals: 18 }
    const { EVMGasProvider } = load('../src/gasProviders/evmGasProvider.ts', {
        './estimateTransferFee': { estimateTransferFee: async (_, tx) => { request = tx; return { fee: 21140474973262n } } },
        '../NetworkSettings': { default: { KnownSettings: {} } },
    })
    const result = await new EVMGasProvider().getGas({
        address: params.selectedWallet.address,
        recipientAddress: params.depositAddress,
        network: { chain_id: '60808', name: 'BOB', token: native }, token, amount: 5435,
    })
    assert.equal(result.gas, 0.000021140474973262)
    assert.equal(result.token, native)
    assert.equal(request.value, 0n) // a full native-balance probe must still estimate
    assert.equal(request.to, contract || params.depositAddress)
    assert.ok(request.data.endsWith('ff'.repeat(32)))
    if (contract) {
        const { decodeFunctionData, erc20Abi } = require('viem')
        const decoded = decodeFunctionData({ abi: erc20Abi, data: request.data.slice(0, -64) })
        assert.deepEqual(decoded.args, [params.depositAddress, 5435000000n])
    }
})

for (const fail of [true, false]) test(`wallet receives the estimated fields and failures retain fee diagnostics: fail=${fail}`, async () => {
    const tx = { chainId: 1, account: params.selectedWallet.address, to: params.depositAddress, value: 1n, data: '0x12', gas: 23000n, maxFeePerGas: 100n, maxPriorityFeePerGas: 1n }
    const phases = []
    const original = Object.assign(new Error('HTTP 429'), { code: 4200 })
    const { createEVMTransferProvider } = load('../src/transferProvider/createEVMTransferProvider.ts', {
        '@wagmi/core': { sendTransaction: async (_, request) => {
            assert.deepEqual(request, { ...tx, connector: 'selected-connector' })
            if (fail) throw original
            return 'hash'
        } },
        './toTransferError': { toTransferError: error => new Error(error.message, { cause: error }) },
        '../service/resolveWalletConnector': { resolveWalletConnector: () => 'selected-connector' },
    })
    const transfer = createEVMTransferProvider({}, () => true, async () => tx).executeTransfer({
        ...params, onSubmissionStateChange: phase => phases.push(phase),
    })
    if (fail) await assert.rejects(transfer, error => {
        assert.equal(error.cause.cause, original)
        assert.equal(JSON.parse(error.cause.details).gasUnits, '23000')
        return true
    })
    else assert.equal(await transfer, 'hash')
    assert.deepEqual(phases, ['preparing', 'submitting'])
})

test('direct transaction intent does not depend on application RPC availability', async () => {
    const { transactionBuilder } = load('../src/transferProvider/transactionBuilder.ts', {
        '../gasProviders/estimateTransferFee': { estimateTransferFee: () => assert.fail('No application fee RPC is required to build intent') },
    })
    const tx = await transactionBuilder(params)
    assert.equal(tx.value, 163036734120886n)
    assert.equal(tx.gas, undefined)
})

test('final estimation uses the supplied wallet RPC and requires no pending block support', async () => {
    const calls = []
    const walletClient = {
        getBlock: async ({ blockTag }) => { assert.equal(blockTag, 'latest'); calls.push('block'); return { baseFeePerGas: 20n } },
        estimateFeesPerGas: async () => ({ maxFeePerGas: 100n, maxPriorityFeePerGas: 1n }),
        estimateGas: async () => 21140n,
    }
    const { estimateTransferFee } = load('../src/gasProviders/estimateTransferFee.ts', {
        viem: { createPublicClient: () => assert.fail('The wallet RPC must replace the application transport') },
        'viem/op-stack': { publicActionsL2: () => ({}) },
        '../evmUtils/resolveChain': { default: () => assert.fail('Wallet client already has its chain') },
        '../evmUtils/resolveTransports': { resolveFallbackTransport: () => assert.fail('No application transport') },
        '../NetworkSettings': { default: { KnownSettings: {} } },
    })
    const result = await estimateTransferFee({ name: 'Ethereum' }, {
        account: params.selectedWallet.address, to: params.depositAddress, data: '0x', value: 1n,
    }, walletClient)
    assert.equal(result.client, walletClient)
    assert.equal(result.fee, 2114000n)
    assert.deepEqual(calls, ['block'])
})

test('bundled transfer prepares with the selected connector provider', async () => {
    const connector = { getProvider: async args => { assert.deepEqual(args, { chainId: 60808 }); return walletProvider } }
    const walletProvider = { request() {} }
    const walletClient = { source: 'selected-wallet' }
    const config = {}
    let builds = 0
    const { createEvmTransfer } = load('../src/transferProvider/createEvmTransfer.ts', {
        viem: {
            custom: provider => { assert.equal(provider, walletProvider); return provider },
            createPublicClient: ({ transport }) => { assert.equal(transport, walletProvider); return walletClient },
        },
        '../evmUtils/resolveChain': { default: () => ({ id: 60808 }) },
        '../service/resolveWalletConnector': { resolveWalletConnector: (actual, wallet) => {
            assert.equal(actual, config); assert.equal(wallet, params.selectedWallet); return connector
        } },
        '@layerswap/widget-types': { NetworkType: { EVM: 'evm' } },
        '../service/getEvmConfig': { getEvmConfig: () => config },
        './createEVMTransferProvider': { createEVMTransferProvider: (_, __, build) => ({ executeTransfer: build }) },
        './transactionBuilder': { transactionBuilder: async (request, client) => {
            assert.equal(request, params); assert.equal(client, walletClient); builds++; return 'hash'
        } },
    })
    assert.equal(await createEvmTransfer().executeTransfer(params), 'hash')
    assert.equal(builds, 1)
})
