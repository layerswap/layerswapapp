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
    assert.equal(result.gas, 27600n)
    assert.equal(result.fee, 27600n * (legacy ? 50n : 100n) + 12345n)
    assert.deepEqual(executionRequest, { ...request, ...(legacy ? { gasPrice: 50n } : { maxFeePerGas: 100n, maxPriorityFeePerGas: 1n }) })
    assert.deepEqual(l1Request, { ...request, chain: undefined, gasPriceOracleAddress: '0xoracle' })
})

for (const contract of [undefined, '0x0000000000000000000000000000000000000003']) for (const amount of [undefined, 0, 5435]) test(`Max fee probe is independent of typed amount: contract=${!!contract}, amount=${amount}`, async () => {
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
        network: { chain_id: '60808', name: 'BOB', token: native }, token, amount,
    })
    assert.equal(result.gas, 0.000021140474973262)
    assert.equal(result.token, native)
    assert.equal(request.value, 0n) // a full native-balance probe must still estimate
    assert.equal(request.to, contract || params.depositAddress)
    assert.ok(request.data.endsWith('ff'.repeat(32)))
    if (contract) {
        const { decodeFunctionData, erc20Abi } = require('viem')
        const decoded = decodeFunctionData({ abi: erc20Abi, data: request.data.slice(0, -64) })
        assert.deepEqual(decoded.args, [params.depositAddress, 1000n])
    }
})

for (const fail of [true, false]) test(`wallet receives the estimated fields and failures retain fee diagnostics: fail=${fail}`, async () => {
    const tx = { chainId: 1, account: params.selectedWallet.address, to: params.depositAddress, value: 1n, data: '0x12', gas: 23000n, maxFeePerGas: 100n, maxPriorityFeePerGas: 1n }
    const phases = []
    let resolutions = 0
    const original = Object.assign(new Error('HTTP 429'), { code: 4200 })
    const connector = { getProvider: async () => ({ request: async () => { if (fail) throw original; return 'hash' } }) }
    const { createEVMTransferProvider } = load('../src/transferProvider/createEVMTransferProvider.ts', {
        '@wagmi/core': { sendTransaction: async (_, request) => {
            assert.equal(request.connector, connector, 'wagmi receives the original connector without interception')
            const { connector: tracked, ...sent } = request
            assert.deepEqual(sent, tx)
            return (await tracked.getProvider()).request({ method: 'eth_sendTransaction' })
        } },
        './toTransferError': { toTransferError: error => new Error(error.message, { cause: error }) },
        '../service/resolveWalletConnector': { resolveWalletConnector: () => { resolutions++; return connector } },
    })
    const transfer = createEVMTransferProvider({}, () => true, async (_, selected) => { assert.equal(selected, connector); return tx }).executeTransfer({
        ...params, onSubmissionStateChange: phase => phases.push(phase),
    })
    if (fail) await assert.rejects(transfer, error => {
        assert.equal(error.cause.cause, original)
        assert.equal(JSON.parse(error.cause.details).gasUnits, '23000')
        return true
    })
    else assert.equal(await transfer, 'hash')
    assert.deepEqual(phases, ['preparing', 'submitting'])
    assert.equal(resolutions, 1)
})

test('direct transaction intent does not depend on application RPC availability', async () => {
    const { transactionBuilder } = load('../src/transferProvider/transactionBuilder.ts', {
        '../gasProviders/estimateTransferFee': { estimateTransferFee: () => assert.fail('No application fee RPC is required to build intent') },
    })
    const tx = await transactionBuilder(params)
    assert.equal(tx.value, 163036734120886n)
    assert.equal(tx.gas, undefined)
})

test('final estimation uses the supplied chain-bound read client and requires no pending block support', async () => {
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
    assert.equal(result.fee, 2536800n)
    assert.deepEqual(calls, ['block'])
})

for (const failure of [undefined, 'network_error', 'timeout', 'unsupported_method', 'insufficient_funds']) for (const walletChain of [60808, 1]) test(`bundled transfer reads requested chain, with checked wallet fallback: failure=${failure}, walletChain=${walletChain}`, async () => {
    const nodes = ['https://chain-rpc.invalid']
    const request = { ...params, network: { ...params.network, nodes } }
    const readClient = { source: 'chain-rpc' }
    const config = {}
    let builds = 0, walletReads = 0
    const original = new Error(failure ?? 'unused')
    const walletClient = { source: 'wallet-rpc' }
    const connector = { getProvider: async () => ({ request: async ({ method }) => { assert.equal(method, 'eth_chainId'); walletReads++; return `0x${walletChain.toString(16)}` } }) }
    const { createEvmTransfer } = load('../src/transferProvider/createEvmTransfer.ts', {
        viem: {
            createPublicClient: ({ chain, transport }) => {
                assert.equal(chain.id, 60808); return transport === nodes ? readClient : walletClient
            },
            custom: provider => provider,
        },
        '@layerswap/wallet-core/errors': { normalizeWalletErrorCode: error => { assert.equal(error, original); return failure } },
        '../evmUtils/resolveChain': { default: network => { assert.equal(network, request.network); return { id: 60808 } } },
        '../evmUtils/resolveTransports': { resolveFallbackTransport: actual => { assert.equal(actual, nodes); return actual } },
        '@layerswap/widget-types': { NetworkType: { EVM: 'evm' } },
        '../service/getEvmConfig': { getEvmConfig: () => config },
        './createEVMTransferProvider': { createEVMTransferProvider: (actual, _, build) => {
            assert.equal(actual, config); return { executeTransfer: props => build(props, connector) }
        } },
        './transactionBuilder': { transactionBuilder: async (props, client) => {
            assert.equal(props, request); builds++;
            if (client === readClient && failure) throw original
            assert.equal(client, failure ? walletClient : readClient); return 'hash'
        } },
    })
    const fallback = failure && failure !== 'insufficient_funds'
    if (failure && (!fallback || walletChain !== 60808)) await assert.rejects(createEvmTransfer().executeTransfer(request), error => error === original)
    else assert.equal(await createEvmTransfer().executeTransfer(request), 'hash')
    assert.equal(builds, fallback && walletChain === 60808 ? 2 : 1)
    assert.equal(walletReads, fallback ? 1 : 0)
})

test('actual contract fee is exposed before rejecting an unaffordable EOA-based Max', async () => {
    const native = { symbol: 'ETH', decimals: 18 }
    const balance = 1000000000000000n
    const actualGas = 120000n, actualFee = actualGas * 1000000000n
    const reviewed = { ...params, network: { ...params.network, token: native }, amount: '0.000974296' }
    let fee
    const { transactionBuilder } = load('../src/transferProvider/transactionBuilder.ts', {
        '../gasProviders/estimateTransferFee': { estimateTransferFee: async (_, tx) => {
            assert.equal(tx.to, reviewed.depositAddress)
            return { gas: actualGas, fees: { gasPrice: 1000000000n }, l1Fee: 0n, fee: actualFee, client: { getBalance: async () => balance } }
        } },
    })
    await assert.rejects(transactionBuilder({ ...reviewed, onFeeEstimate: value => { fee = value } }, {}), error => error.code === 'INSUFFICIENT_FUNDS')
    assert.deepEqual(fee, { gas: 0.00012, token: native })
    const adjusted = '0.0008776' // balance minus this fee and the existing 2% reserve
    const tx = await transactionBuilder({ ...reviewed, amount: adjusted }, {})
    assert.equal(tx.value, 877600000000000n)
    assert.equal(tx.gas, actualGas)
})

for (const outcome of ['affordable', 'exact-balance', 'insufficient', 'balance-error']) test(`fee adjustment is reported only for failed affordability: ${outcome}`, async () => {
    const native = { symbol: 'ETH', decimals: 18 }
    const fee = 120000000000000n
    const value = 163036734120886n
    const balance = value + fee + (outcome === 'insufficient' ? -1n : outcome === 'affordable' ? 1n : 0n)
    const readFailure = new Error('Balance RPC unavailable')
    const events = []
    let reported
    const { transactionBuilder } = load('../src/transferProvider/transactionBuilder.ts', {
        '../gasProviders/estimateTransferFee': { estimateTransferFee: async () => ({
            gas: 120000n, fees: { gasPrice: 1000000000n }, l1Fee: 0n, fee,
            client: { getBalance: async () => {
                events.push('balance')
                if (outcome === 'balance-error') throw readFailure
                return balance
            } },
        }) },
    })
    const result = transactionBuilder({ ...params, network: { ...params.network, token: native },
        onFeeEstimate: estimate => { events.push('adjustment'); reported = estimate },
    }, {})
    if (outcome === 'insufficient') {
        await assert.rejects(result, error => error.code === 'INSUFFICIENT_FUNDS')
        assert.deepEqual(reported, { gas: 0.00012, token: native })
        assert.deepEqual(events, ['balance', 'adjustment'])
    } else {
        if (outcome === 'balance-error') await assert.rejects(result, error => error === readFailure)
        else {
            const tx = await result
            assert.equal(tx.value, value)
            assert.equal(tx.gas, 120000n)
            assert.equal(tx.gasPrice, 1000000000n)
        }
        assert.equal(reported, undefined)
        assert.deepEqual(events, ['balance'])
    }
})
